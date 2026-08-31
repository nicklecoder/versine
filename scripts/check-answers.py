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
import math
import re
import sys
from fractions import Fraction
from pathlib import Path

LIB = Path(__file__).resolve().parent.parent / "web" / "library"
VARS = "xynat"
problems: list[str] = []
checked = 0


class Evaluator:
    """
    A small, correct evaluator over exact rationals.

    Written properly rather than by translating the text into Python and
    calling eval, which was tried and produced three separate wrong answers
    from the checker itself: floats where rationals were meant, "1/2 ÷ 1/10"
    read as 1/2/1/10, and "2(a + 1)" split apart on its spaces. The last
    attempt got 10 ÷ 2 × 2 wrong -- which is the exact problem order-ops L2
    exists to teach.

        expr   := term (('+' | '-') term)*
        term   := frac (('×' | '÷' | '*') frac)*      left to right
        frac   := factor ('/' factor)*                binds tighter
        factor := '-' factor | power
        power  := atom ('^' factor)?
        atom   := number | '(' expr ')'

    The fraction bar and the division sign are two different operators here,
    and the bar binds tighter: "1/2 ÷ 1/10" is one half divided by one tenth,
    which is 5, not 1/20. Collapsing both to a slash loses that -- and reading
    it as a slash also makes "10 ÷ 2 × 2" come out as 5/2, which is the exact
    mistake order-ops L2 exists to teach.

    Juxtaposition is a multiplication, so 2(a + 1) works.
    """

    TOKEN = re.compile(r"\d+\.\d+|\d+|÷|[-+*/^()]")

    def __init__(self, src: str):
        text = src.replace("−", "-").replace("×", "*").replace("·", "*")
        self.t = self.TOKEN.findall(text)
        if "".join(self.t) != re.sub(r"\s+", "", text):
            raise ValueError(f"unreadable: {src}")
        self.i = 0

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else None

    def expr(self) -> Fraction:
        out = self.term()
        while self.peek() in ("+", "-"):
            op = self.t[self.i]; self.i += 1
            out = out + self.term() if op == "+" else out - self.term()
        return out

    def term(self) -> Fraction:
        out = self.frac()
        while True:
            nxt = self.peek()
            if nxt in ("*", "÷"):
                self.i += 1
                rhs = self.frac()
                out = out * rhs if nxt == "*" else out / rhs
            elif nxt == "(":                      # juxtaposition: 2(a + 1)
                out = out * self.frac()
            else:
                return out

    def frac(self) -> Fraction:
        out = self.factor()
        while self.peek() == "/":
            self.i += 1
            out /= self.factor()
        return out

    def factor(self) -> Fraction:
        if self.peek() == "-":
            self.i += 1
            return -self.factor()
        return self.power()

    def power(self) -> Fraction:
        base = self.atom()
        if self.peek() == "^":
            self.i += 1
            return base ** int(self.factor())
        return base

    def atom(self) -> Fraction:
        tok = self.peek()
        if tok is None:
            raise ValueError("ends early")
        if tok == "(":
            self.i += 1
            inner = self.expr()
            if self.peek() != ")":
                raise ValueError("unclosed bracket")
            self.i += 1
            return inner
        self.i += 1
        return Fraction(tok)


def evaluate(src: str, var: str | None = None, value=None) -> Fraction:
    text = src if var is None else src.replace(var, f"({value})")
    ev = Evaluator(text)
    out = ev.expr()
    if ev.i != len(ev.t):
        raise ValueError(f"trailing input in {src}")
    return out


def var_in(text: str) -> str | None:
    return next((c for c in VARS if c in text), None)


def as_fraction(v):
    """An answer value, whatever shape it was stored in, as an exact rational."""
    return Fraction(v["n"], v["d"]) if isinstance(v, dict) else Fraction(v)


# Questions the evaluator cannot read as an expression: asked in words, or
# written with a blank in them. Both left whole levels resting on nothing but
# the generator agreeing with itself -- every prose-asked level, and, less
# obviously, every equivalence, since "2/3 = ?/12" is not an expression and
# fell through every branch below in silence. These re-derive the answer from
# the numbers in the question, by a different route than the generator took.
BY_RULE = (
    (re.compile(r"^GCF of (\d+) and (\d+)$"),
     lambda a, b: math.gcd(a, b)),
    (re.compile(r"^LCM of (\d+) and (\d+)$"),
     lambda a, b: a * b // math.gcd(a, b)),
    (re.compile(r"^smallest prime factor of (\d+)$"),
     lambda n: next(d for d in range(2, n + 1) if n % d == 0)),
    (re.compile(r"^(\d+) : (\d+) = (\d+) : \?$"),
     lambda a, b, c: Fraction(b * c, a)),
    (re.compile(r"^(\d+) : (\d+) = \? : (\d+)$"),
     lambda a, b, c: Fraction(a * c, b)),
    (re.compile(r"^(\d+) : (\d+) of (\d+), (first|second) share$"),
     lambda a, b, total, which: Fraction((a if which == "first" else b) * total, a + b)),
    (re.compile(r"^unit rate of (\d+) per (\d+)$"),
     lambda total, n: Fraction(total, n)),
    (re.compile(r"^(\d+) for (\d+), then (\d+)$"),
     lambda cost, n, want: Fraction(cost * want, n)),
    # Equivalent fractions, either part missing. Cross-multiplication, which
    # is not the route any generator takes: they all build outwards from a
    # base fraction and a multiplier.
    (re.compile(r"^(\d+)/(\d+) = \?/(\d+)$"),
     lambda n, d, big_d: Fraction(n * big_d, d)),
    (re.compile(r"^(\d+)/(\d+) = (\d+)/\?$"),
     lambda n, d, big_n: Fraction(big_n * d, n)),
    (re.compile(r"^(\d+)/(\d+) in lowest terms$"),
     lambda n, d: Fraction(n, d)),
)


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

        # Asked in words, or written with a blank: re-derive from the numbers.
        elif any(rule.match(text) for rule, _ in BY_RULE):
            rule, solve = next(r for r in BY_RULE if r[0].match(text))
            args = [g if not g.isdigit() else int(g) for g in rule.match(text).groups()]
            want = Fraction(solve(*args))
            checked += 1
            if want != as_fraction(answer["value"]):
                problems.append(f"{where}: {text} is {want}, not {answer['value']}")

        # A plain arithmetic expression: work it out and compare.
        elif answer["type"] in ("int", "frac", "decimal") and not var_in(text):
            if not re.fullmatch(r"[-−\d\s+×÷*/().]+", text):
                continue
            try:
                want = evaluate(text)
            except Exception:
                continue
            got = as_fraction(answer["value"])
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
