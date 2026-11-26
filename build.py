#!/usr/bin/env python3
"""Turn the modalities spreadsheet into the data the mandala loads.

    python3 build.py                      # reads data/PPN Healing Modalities Reference.xlsx
    python3 build.py path/to/sheet.xlsx   # or another .xlsx
    python3 build.py path/to/sheet.csv    # or a CSV export of the Modalities tab

It writes two files with the same content:
    modalities.json  the data, for any page or tool that wants it
    modalities.js    the same data as a script, so the mandala also opens straight from a folder

The spreadsheet is the source of truth. Nothing here rewrites its text. The only things added are
an id for each modality and the "who it is for" groups the filter uses (see WHO below).
Uses only the Python standard library.
"""
import csv, json, re, sys, zipfile, xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT = HERE / "data" / "PPN Healing Modalities Reference.xlsx"
TYPES_CSV = HERE / "data" / "types.csv"

STAGES = ["Preconception", "Pregnancy", "Birth", "Fourth trimester", "Early childhood", "Adulthood"]
TYPES = ["Somatic", "Relational", "Sound", "Contemplative", "Energetic", "Hypnotic", "Cognitive"]   # order around the wheel
EVIDENCE = ["Research-based", "Some research", "Case reports", "Practice-based"]                    # strongest first

# The "who it is for" filter. The card always shows the spreadsheet's own words; these groups only
# decide which filter buttons a modality answers to. A modality can belong to several.
# Each group lists the words (regular expressions) that place a modality in it. Edit freely.
WHO = [
    ("prenate", "Prenate",  [r"\bfetus\b", r"\bprenates?\b"]),
    ("newborn", "Newborn",  [r"\bnewborns?\b", r"\bpreterm\b"]),
    ("baby",    "Baby",     [r"\bbab(y|ies)\b", r"(?<!preterm )\binfants?\b"]),
    ("child",   "Child",    [r"\bchild(ren)?\b"]),
    ("mother",  "Mother",   [r"\bmothers?\b", r"\bpregnant\b", r"\bpostpartum\b"]),
    ("partner", "Partner",  [r"\bpartners?\b", r"\bfathers?\b", r"\bcouples?\b"]),
    ("family",  "Family",   [r"\bfamil(y|ies)\b", r"\bparents?\b"]),
    ("adult",   "Adult",    [r"\badults?\b"]),
]

FIELDS = {   # spreadsheet column -> key in the data
    "Modality": "name",
    "Definition": "definition",
    "Type": "type",
    "Who it is for": "who",
    "What it addresses": "addresses",
    "For the educator: in plain words": "plain",
    "Who can practice it": "practitioner",
    "Self-help elements": "selfHelp",
    "Find a practitioner": "find",
    "My referrals": "myReferrals",
    "What a session looks like": "session",
    "Questions a family might ask": "questions",
    "How to offer it": "offer",
    "Be careful about": "careful",
    "Reach out if": "reachOut",          # not in the sheet yet; the card shows a placeholder until it is
    "Evidence level": "evidence",
    "Founder or key figures": "founder",
    "Origin": "origin",
    "Module 12 source": "source",
}
REQUIRED = [c for c in FIELDS if c not in ("Reach out if", "My referrals")] + [f"When it fits: {s}" for s in STAGES]


def read_xlsx(path, name="Modalities", fallback=True):
    """One sheet of an .xlsx file, as a list of rows: the sheet called `name`, else the first sheet
    (or None when fallback is off)."""
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
          "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
    m = "{%s}" % ns["m"]
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", ns):
            shared.append("".join(t.text or "" for t in si.iter(m + "t")))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    sheets = {s.get("name"): s for s in wb.find("m:sheets", ns)}
    first = sheets.get(name) or (next(iter(sheets.values())) if fallback else None)
    if first is None:
        return None
    target = rels[first.get("{%s}id" % ns["r"])].lstrip("/")
    target = target if target.startswith("xl/") else "xl/" + target

    def col(ref):
        n = 0
        for ch in re.match(r"[A-Z]+", ref).group():
            n = n * 26 + ord(ch) - 64
        return n - 1

    rows = []
    for row in ET.fromstring(z.read(target)).iter(m + "row"):
        vals = {}
        for c in row.findall("m:c", ns):
            t, v = c.get("t"), c.find("m:v", ns)
            if t == "s" and v is not None:
                vals[col(c.get("r"))] = shared[int(v.text)]
            elif t == "inlineStr":
                vals[col(c.get("r"))] = "".join(x.text or "" for x in c.iter(m + "t"))
            elif v is not None:
                vals[col(c.get("r"))] = v.text
        if vals:
            rows.append([vals.get(i, "") for i in range(max(vals) + 1)])
    return rows


def read_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as fh:
        return list(csv.reader(fh))


def type_info(src):
    """A short description of each type, shown when someone hovers over that type on the wheel.
    It comes from a "Types" tab in the spreadsheet if there is one, else from data/types.csv.
    Either needs the columns "Type" and "Description", one row per type."""
    rows = read_xlsx(src, "Types", fallback=False) if src.suffix.lower() == ".xlsx" else None
    if not rows and TYPES_CSV.exists():
        rows = read_csv(TYPES_CSV)
    if not rows:
        return {}
    head = [h.strip() for h in rows[0]]
    if "Type" not in head or "Description" not in head:
        return {}
    ti, di = head.index("Type"), head.index("Description")
    return {r[ti].strip(): r[di].strip() for r in rows[1:] if len(r) > max(ti, di) and r[ti].strip() and r[di].strip()}


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    rows = read_xlsx(src) if src.suffix.lower() == ".xlsx" else read_csv(src)
    head = [h.strip() for h in rows[0]]
    missing = [c for c in REQUIRED if c not in head]
    if missing:
        sys.exit(f"Missing columns in {src.name}: {', '.join(missing)}")

    problems, out = [], []
    for r in rows[1:]:
        r = [x.strip() for x in r] + [""] * (len(head) - len(r))
        rec = dict(zip(head, r))
        if not rec["Modality"]:
            continue
        m = {"id": slug(rec["Modality"])}
        for column, key in FIELDS.items():
            m[key] = rec.get(column, "")
        m["stages"] = [{"stage": s, "text": rec[f"When it fits: {s}"]} for s in STAGES if rec[f"When it fits: {s}"]]
        m["whoGroups"] = [k for k, _, pats in WHO if any(re.search(p, m["who"], re.I) for p in pats)]
        if m["type"] not in TYPES:
            problems.append(f'{m["name"]}: type "{m["type"]}" is not one of {", ".join(TYPES)}')
        if m["evidence"] not in EVIDENCE:
            problems.append(f'{m["name"]}: evidence level "{m["evidence"]}" is not one of {", ".join(EVIDENCE)}')
        if not m["stages"]:
            problems.append(f'{m["name"]}: no "When it fits" column is filled in')
        if not m["whoGroups"]:
            problems.append(f'{m["name"]}: no "who it is for" group matched "{m["who"]}"')
        out.append(m)

    data = {
        "source": src.name,
        "stages": STAGES,
        "types": TYPES,
        "evidence": EVIDENCE,
        "who": [{"id": k, "label": label} for k, label, _ in WHO],
        "typeInfo": type_info(src),
        "hasReachOut": "Reach out if" in head,
        "modalities": out,
    }
    text = json.dumps(data, ensure_ascii=False, indent=1)
    (HERE / "modalities.json").write_text(text + "\n", encoding="utf-8")
    (HERE / "modalities.js").write_text(
        "/* Built from the modalities spreadsheet by build.py. Do not edit by hand; edit the sheet and rebuild. */\n"
        "window.MODALITIES = " + text + ";\n", encoding="utf-8")

    print(f"Read {len(out)} modalities from {src.name}.")
    for m in out:
        groups = ", ".join(label for k, label, _ in WHO if k in m["whoGroups"])
        print(f'  {m["name"]}  [{m["type"]}, {m["evidence"]}]  who: {groups}')
    if not data["typeInfo"]:
        print('Note: no type descriptions found (a "Types" tab or data/types.csv).')
    if not data["hasReachOut"]:
        print('Note: no "Reach out if" column yet. Each card shows a placeholder for it.')
    if len(out) != 20:
        problems.append(f"Expected 20 modalities, found {len(out)}")
    for p in problems:
        print("Check:", p)


if __name__ == "__main__":
    main()
