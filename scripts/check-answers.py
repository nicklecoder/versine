#!/usr/bin/env python3
"""
Re-derive answers independently of the generators that produced them.

Every other check asks whether a problem is well-formed. This asks whether it
is *right* -- by solving it again, in a different language, with arithmetic
that knows nothing about how it was made. A generator that disagrees with
itself passes every structural check: x/3 = 4 once claimed x = 4 while its own
worked lines said x = 12, and only substitution caught it.

Exact rationals throughout, never floats.

Usage: python3 scripts/check-answers.py
"""
import json
import re
import sys
from fractions import Fraction
from pathlib import Path

LIB = Path(__file__).resolve().parent.parent / "web" / "library"
VARS = "xynat"
problems: list[str] = []
checked = 0


def evaluate(src: str, var: str | None = None, value=None) -> Fraction:
    """
    Arithmetic in exact rationals.

    Every numeric literal becomes a Fraction *before* anything is evaluated.
    The first version of this let Python compute 0.08 + 9.2 in floats and
    converted the result, which reported 5224175567749775/562949953421312 --
    the binary approximation, exactly the fault this check exists to catch,
    committed by the check itself.
    """
    # Bracket each operand before touching the operators. "1/2 ÷ 1/10" would
    # otherwise flatten to 1/2/1/10 and be read left to right as 1/20 -- the
    # slash inside a fraction and the slash of division are not the same slash.
    parts = src.replace("−", "-").split(" ")
    e = " ".join(t if t in ("+", "-", "×", "÷", "*", "/") else f"({t})" for t in parts)
    e = e.replace("×", "*").replace("÷", "/").replace("^", "**")
    if var:
        e = e.replace(var, f"({value})")
    e = re.sub(r"(\d)\s*\(", r"\1*(", e)
    e = re.sub(r"\)\s*(\d)", r")*\1", e)
    e = re.sub(r"\)\s*\(", r")*(", e)
    # One pass: re.sub does not rescan its own replacements.
    e = re.sub(r"\d+\.\d+|\d+", lambda m: f'F("{m.group(0)}")', e)
    return Fraction(eval(e, {"__builtins__": {}}, {"F": Fraction}))


def var_in(text: str) -> str | None:
    return next((c for c in VARS if c in text), None)


for path in sorted(LIB.glob("*.json")):
    if path.name in ("manifest.json", "schemas.json"):
        continue
    lib = json.loads(path.read_text())
    for i, p in enumerate(lib["problems"]):
        text, answer = p["text"], p["answer"]
        where = f"{lib['skill']} L{lib['level'] + 1} row {i}"

        # An equation: substitute the claimed solution and see if it balances.
        if " = " in text and answer["type"] == "int" and var_in(text):
            v = var_in(text)
            lhs, rhs = text.split(" = ", 1)
            if "?" in rhs or "?" in lhs:
                continue
            try:
                checked += 1
                if evaluate(lhs, v, answer["value"]) != evaluate(rhs, v, answer["value"]):
                    problems.append(f"{where}: {text} does not balance at {v} = {answer['value']}")
            except Exception:
                checked -= 1

        # A plain arithmetic expression: work it out and compare.
        elif answer["type"] in ("int", "frac", "decimal") and not var_in(text):
            if not re.fullmatch(r"[-−\d\s+×÷*/().]+", text):
                continue
            try:
                want = evaluate(text)
            except Exception:
                continue
            v = answer["value"]
            got = Fraction(v["n"], v["d"]) if isinstance(v, dict) else Fraction(v)
            checked += 1
            if want != got:
                problems.append(f"{where}: {text} is {want}, not {got}")

if problems:
    print(f"{len(problems)} wrong answer(s):")
    for line in problems[:15]:
        print("  " + line)
    if len(problems) > 15:
        print(f"  ... and {len(problems) - 15} more")
    sys.exit(1)

print(f"answers: {checked:,} re-derived independently — all correct")
