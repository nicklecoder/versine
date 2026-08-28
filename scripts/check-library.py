#!/usr/bin/env python3
"""
Validate the problem libraries before they are allowed to serve students.

The libraries are the catalogue. Their rows are meant to be edited by hand --
finding a bad problem and correcting it in place is far better than debugging
the generator that produced it -- so this deliberately does NOT check that a
library still matches its generator. A hand-fixed library is *supposed* to
diverge from the code that first produced it.

What it checks instead is that every row is still usable: the structural
mistakes an editor actually makes. Written in Python because the server has it
and should not need a JavaScript runtime installed to refuse a bad deploy.

Usage: python3 scripts/check-library.py [--floor N]
Exits non-zero, with reasons, if anything would break a run.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIB = ROOT / "web" / "library"
KNOWN_TYPES = {"int", "frac", "mixed", "choice"}

# The presentation vocabulary, exported from the renderers by
# scripts/build-library.mjs. A catalogue item may only ask for a picture the
# system knows how to draw, with parameters that renderer can actually use.
SCHEMAS = {}
_schema_path = LIB / "schemas.json"
if _schema_path.is_file():
    try:
        SCHEMAS = json.loads(_schema_path.read_text())
    except json.JSONDecodeError:
        SCHEMAS = {}


def check_field(value, rule, where, field, out):
    """Validate one field against its declared rule. Additive by design: an
    unknown type passes, so a renderer can declare something richer than this
    understands without blocking a deploy."""
    t = rule.get("type", "any")
    if t == "int":
        if not isinstance(value, int) or isinstance(value, bool):
            out.append(f"{where}: {field} should be a whole number, got {value!r}")
            return
    elif t == "number":
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            out.append(f"{where}: {field} should be a number, got {value!r}")
            return
    elif t == "string":
        if not isinstance(value, str):
            out.append(f"{where}: {field} should be text, got {value!r}")
            return
    elif t == "bool":
        if not isinstance(value, bool):
            out.append(f"{where}: {field} should be true or false, got {value!r}")
            return
    elif t == "frac":
        if not isinstance(value, dict) or not isinstance(value.get("n"), int) \
                or not isinstance(value.get("d"), int):
            out.append(f"{where}: {field} should be a fraction {{n, d}}, got {value!r}")
            return
        if value["d"] == 0:
            out.append(f"{where}: {field} has a zero denominator")
    elif t == "enum":
        if value not in rule.get("values", []):
            out.append(f"{where}: {field} is {value!r}, not one of {rule.get('values')}")
            return
    elif t == "array":
        if not isinstance(value, list):
            out.append(f"{where}: {field} should be a list, got {value!r}")
            return
        of = rule.get("of")
        if of:
            for i, item in enumerate(value):
                check_field(item, of, where, f"{field}[{i}]", out)
    elif t == "object":
        if not isinstance(value, dict):
            out.append(f"{where}: {field} should be an object, got {value!r}")
            return

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "min" in rule and value < rule["min"]:
            out.append(f"{where}: {field} is {value}, below the minimum of {rule['min']}")
        if "max" in rule and value > rule["max"]:
            out.append(f"{where}: {field} is {value}, above the maximum of {rule['max']}")


def check_visual(visual, where, out):
    if visual is None:
        return
    if not isinstance(visual, dict):
        out.append(f"{where}: visual should be an object or null")
        return
    kind = visual.get("kind")
    if not kind:
        out.append(f"{where}: visual has no kind")
        return
    if not SCHEMAS:
        return                      # no vocabulary exported; nothing to check against
    schema = SCHEMAS.get(kind)
    if schema is None:
        out.append(f"{where}: visual kind {kind!r} is not one the system can draw")
        return
    for field, rule in schema.items():
        if field not in visual:
            if rule.get("required"):
                out.append(f"{where}: visual {kind} is missing required field {field!r}")
            continue
        check_field(visual[field], rule, where, f"visual.{field}", out)
    for field in visual:
        if field != "kind" and field not in schema:
            out.append(f"{where}: visual {kind} has unknown field {field!r}")
REQUIRED = ("text", "prompt", "answer", "parSeconds")

floor = 20
if "--floor" in sys.argv:
    floor = int(sys.argv[sys.argv.index("--floor") + 1])

problems: list[str] = []


def fail(msg: str) -> None:
    problems.append(msg)


manifest_path = LIB / "manifest.json"
if not manifest_path.is_file():
    print("no library manifest; nothing to validate")
    sys.exit(0)

try:
    manifest = json.loads(manifest_path.read_text())
except json.JSONDecodeError as exc:
    print(f"manifest.json is not valid JSON: {exc}")
    sys.exit(1)

levels = manifest.get("levels", [])
if not levels:
    fail("manifest lists no levels")

checked = 0
for entry in levels:
    name = f"{entry.get('skill')} L{entry.get('level', -1) + 1}"
    path = LIB / entry.get("file", "")
    if not path.is_file():
        fail(f"{name}: library file {entry.get('file')} is missing")
        continue
    try:
        lib = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        fail(f"{name}: {path.name} is not valid JSON — {exc}")
        continue

    rows = lib.get("problems", [])
    if len(rows) != entry.get("count"):
        fail(f"{name}: manifest says {entry.get('count')} problems, file holds {len(rows)}")
    if len(rows) < floor:
        fail(f"{name}: only {len(rows)} problems — a student would memorise it")

    seen: set[str] = set()
    for i, row in enumerate(rows):
        where = f"{name} row {i}"
        missing = [k for k in REQUIRED if k not in row]
        if missing:
            fail(f"{where}: missing {', '.join(missing)}")
            continue
        if not str(row["text"]).strip():
            fail(f"{where}: empty text")
        if row["text"] in seen:
            fail(f"{where}: duplicate problem {row['text']!r}")
        seen.add(row["text"])

        ans = row["answer"]
        if not isinstance(ans, dict):
            fail(f"{where}: answer is not an object")
            continue
        if ans.get("type") not in KNOWN_TYPES:
            fail(f"{where}: unknown answer type {ans.get('type')!r}")
        if "value" not in ans:
            fail(f"{where}: answer has no value")
        accept = ans.get("accept")
        if not isinstance(accept, list) or not accept:
            fail(f"{where}: answer has no accepted forms")
        elif any(not isinstance(a, str) or not a.strip() for a in accept):
            fail(f"{where}: an accepted form is empty or not a string")
        if ans.get("type") == "choice":
            opts = ans.get("options") or []
            ids = [o.get("id") for o in opts if isinstance(o, dict)]
            if len(opts) < 2:
                fail(f"{where}: a choice needs at least two options")
            if ans.get("value") not in ids:
                fail(f"{where}: the correct option is not among the options")
        if not isinstance(row["parSeconds"], (int, float)) or row["parSeconds"] <= 0:
            fail(f"{where}: parSeconds is not a positive number")
        check_visual(row.get("visual"), where, problems)
    checked += len(rows)

if problems:
    print(f"{len(problems)} problem(s) found in the libraries:")
    for line in problems[:25]:
        print(f"  {line}")
    if len(problems) > 25:
        print(f"  ... and {len(problems) - 25} more")
    sys.exit(1)

kinds = len(SCHEMAS)
print(f"{len(levels)} levels, {checked:,} problems, {kinds} visual kinds — all valid")
