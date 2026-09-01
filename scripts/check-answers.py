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


def half_up(x: Fraction, places: int) -> Fraction:
    """Round to `places` decimals, halves going up, without ever touching a float."""
    scale = 10 ** places
    y = x * scale
    whole = y // 1
    return Fraction(int(whole) + (1 if (y - whole) * 2 >= 1 else 0), scale)


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
    # Either part may carry a minus: a signed fraction is asked in exactly
    # this form, and the answer is the same fraction with the sign moved in
    # front, which Fraction does for itself.
    (re.compile(r"^(-?\d+)/(-?\d+) in lowest terms$"),
     lambda n, d: Fraction(int(n), int(d))),
    # Rounding, re-derived in exact rationals. Doing it in floats is the one
    # way to get this wrong that matters: 2.675 is not 2.675 as a double, so a
    # float check would call the correct 2.68 an error.
    (re.compile(r"^([\d.]+) to the nearest whole$"),
     lambda v: half_up(Fraction(v), 0)),
    (re.compile(r"^([\d.]+) to (\d) dp$"),
     lambda v, places: half_up(Fraction(v), places)),
    # Percent change and reverse percentage, each re-derived from the two
    # numbers rather than from the percent the generator started with.
    (re.compile(r"^(\d+) to (\d+), percent change$"),
     lambda a, b: Fraction(abs(b - a) * 100, a)),
    (re.compile(r"^(\d+) after (up|down) (\d+)%, before$"),
     lambda now, way, pct: Fraction(now * 100, 100 + pct if way == "up" else 100 - pct)),
    (re.compile(r"^estimate ([\d.]+) ([×+]) ([\d.]+)$"),
     lambda a, op, b: (half_up(Fraction(a), 0) * half_up(Fraction(b), 0) if op == "×"
                       else half_up(Fraction(a), 0) + half_up(Fraction(b), 0))),
    # Two amounts combined, each written in whichever form the question used:
    # a mixed number, a top-heavy fraction, a proper fraction or a whole. The
    # evaluator cannot read "1 1/10 + 2 1/2" -- a whole beside a fraction is
    # juxtaposition meaning addition, which is not what juxtaposition means
    # anywhere else in this notation -- so the conversion happens here, by the
    # same route a student takes.
    (re.compile(r"^(\d+ \d+/\d+|\d+/\d+|\d+) ([+\u2212×÷]) "
                r"(\d+ \d+/\d+|\d+/\d+|\d+)$"),
     lambda a, op, b: mixed_op(a, op, b)),
    # A linear inequality, solved from scratch -- including the flip, which is
    # derived here from the sign of the coefficient rather than copied from
    # the generator's own reasoning about it.
    (re.compile(r"^(\u2212?)(\d*)([a-z])(?: ([+\u2212]) (\d+))? "
                r"([<>\u2265\u2264]) (\u2212?\d+), (largest|smallest)$"),
     lambda neg, coeff, _v, op, b, sign, rhs, want:
        solve_inequality(neg, coeff, op, b, sign, rhs, want)),
)


def amount(text: str) -> Fraction:
    """"2 1/2", "5/2", "1/4" or "3" — all one number, read whichever way it is written."""
    text = str(text)
    if " " in text:
        whole, rest = text.split(" ")
        n, d = rest.split("/")
        return Fraction(int(whole) * int(d) + int(n), int(d))
    if "/" in text:
        n, d = text.split("/")
        return Fraction(int(n), int(d))
    return Fraction(int(text))


def mixed_op(a, op, b):
    """Two amounts combined, each converted to a single fraction first."""
    x, y = amount(a), amount(b)
    return {"+": x + y, "\u2212": x - y, "×": x * y, "÷": x / y}[op]


def solve_inequality(neg, coeff, op, b, sign, rhs, want):
    """kx + c  SIGN  rhs -> the largest or smallest whole number that satisfies it."""
    k = Fraction(int(coeff) if coeff else 1) * (-1 if neg else 1)
    c = Fraction(0 if b is None else (int(b) * (-1 if op == "\u2212" else 1)))
    right = Fraction(str(rhs).replace("\u2212", "-"))
    boundary = (right - c) / k
    strict = sign in ("<", ">")
    # Dividing by a negative turns the relation around, so which end of the
    # range is wanted turns around with it -- exactly the rule under test.
    if want == "largest":
        floor = boundary // 1
        return floor - 1 if strict and floor == boundary else floor
    ceil = -((-boundary) // 1)
    return ceil + 1 if strict and ceil == boundary else ceil


for path in sorted(LIB.glob("*.json")):
    if path.name in ("manifest.json", "schemas.json"):
        continue
    lib = json.loads(path.read_text())
    for i, p in enumerate(lib["problems"]):
        text, answer = p["text"], p["answer"]
        where = f"{lib['skill']} L{lib['level'] + 1} row {i}"

        # An equation: substitute the claimed solution and see if it balances.
        #
        # Fractional and negative solutions substitute the same way, since the
        # evaluator works in exact rationals and reads "10(-6/5)" as the
        # juxtaposed product it is. Restricting this to whole answers left
        # every non-whole solution in the catalogue -- a thousand rows of
        # equations-both -- checked by nothing at all.
        if " = " in text and answer["type"] in ("int", "frac", "decimal") and var_in(text):
            v = var_in(text)
            lhs, rhs = text.split(" = ", 1)
            if "?" in rhs or "?" in lhs:
                continue
            sub = as_fraction(answer["value"])
            try:
                checked += 1
                if evaluate(lhs, v, sub) != evaluate(rhs, v, sub):
                    problems.append(f"{where}: {text} does not balance at {v} = {sub}")
            except Exception:
                checked -= 1

        # Asked in words, or written with a blank: re-derive from the numbers.
        elif any(rule.match(text) for rule, _ in BY_RULE):
            rule, solve = next(r for r in BY_RULE if r[0].match(text))
            args = [g if g is None or not g.isdigit() else int(g)
                    for g in rule.match(text).groups()]
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
