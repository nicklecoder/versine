"""PIN authentication.

A 4-digit PIN is weak by design -- this is a home LAN app and the cost of
friction on a phone keyboard is higher than the risk. It is still hashed
(never stored in the clear) and rate limited, so a bored sibling can't brute
force their way into the teacher console.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
import time
from collections import defaultdict

import db

PIN_LENGTH = 4
_ITERATIONS = 200_000

# user_id -> [timestamps of recent failures]
_failures: dict[int, list[float]] = defaultdict(list)
_LOCKOUT_AFTER = 5
_LOCKOUT_SECONDS = 60


def hash_pin(pin: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt.encode(), _ITERATIONS)
    return digest.hex(), salt


def verify_pin(pin: str, pin_hash: str, salt: str) -> bool:
    candidate, _ = hash_pin(pin, salt)
    return hmac.compare_digest(candidate, pin_hash)


def valid_pin_format(pin: str) -> bool:
    return len(pin) == PIN_LENGTH and pin.isdigit()


def seconds_locked_out(user_id: int) -> int:
    recent = [t for t in _failures[user_id] if time.time() - t < _LOCKOUT_SECONDS]
    _failures[user_id] = recent
    if len(recent) < _LOCKOUT_AFTER:
        return 0
    return int(_LOCKOUT_SECONDS - (time.time() - recent[0])) + 1


def record_failure(user_id: int) -> None:
    _failures[user_id].append(time.time())


def clear_failures(user_id: int) -> None:
    _failures.pop(user_id, None)


def create_session(conn, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    conn.execute(
        "INSERT INTO auth_sessions (token, user_id, created_at) VALUES (?, ?, ?)",
        (token, user_id, db.now()),
    )
    return token


def user_for_token(conn, token: str | None):
    if not token:
        return None
    return conn.execute(
        """SELECT u.* FROM auth_sessions s
           JOIN users u ON u.id = s.user_id
           WHERE s.token = ?""",
        (token,),
    ).fetchone()


def destroy_session(conn, token: str | None) -> None:
    if token:
        conn.execute("DELETE FROM auth_sessions WHERE token = ?", (token,))
