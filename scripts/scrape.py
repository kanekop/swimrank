#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""swimrank data pipeline (python3 stdlib only, single file).

Fetches the 44 Masters qualification-table pages (cache-first into
scripts/cache/), repairs source typos with an iterative detect/repair loop,
validates hard invariants, and emits src/data/sikaku.json plus
scripts/repair-report.md.

Usage:
    python3 scripts/scrape.py            # normal run (cache-first)
    python3 scripts/scrape.py --refetch  # ignore cache, refetch every page
    python3 scripts/scrape.py --test     # self-tests (+ offline full-pipeline
                                         #  test when scripts/cache/ is complete)

Exit code is non-zero if validation or --test fails.
"""
import json
import math
import os
import re
import subprocess
import sys
import time
from datetime import date, datetime, timedelta, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
CACHE_DIR = os.path.join(SCRIPT_DIR, "cache")
OVERRIDES_PATH = os.path.join(SCRIPT_DIR, "overrides.json")
REPORT_PATH = os.path.join(SCRIPT_DIR, "repair-report.md")
OUT_JSON_PATH = os.path.join(ROOT, "src", "data", "sikaku.json")

BASE_URL = "https://zavastsurumi.web.fc2.com/organization/sikaku/"
SOURCE_NAME = "マスターズ水泳年齢別資格表"

STROKES = {
    "Fr": [25, 50, 100, 200, 400, 800, 1500],
    "Bc": [25, 50, 100, 200],
    "Br": [25, 50, 100, 200],
    "Bt": [25, 50, 100, 200],
    "IM": [100, 200, 400],
}
GENDERS = ["men", "women"]
AGE_GROUPS = ["18-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54",
              "55-59", "60-64", "65-69", "70-74", "75-79", "80-84", "85-89", "90-"]
GRADES = list(range(20, 0, -1))

DEV_SUSPECT = 0.04   # dual-signal detection threshold
DEV_ACCEPT = 0.02    # candidate acceptance threshold
MAX_ITER = 200
FETCH_SLEEP = 0.3
EXCEL_EPOCH = date(1899, 12, 30)
REIWA_START = date(2019, 5, 1)   # Reiwa range guard for date-decode


def all_slugs():
    return [f"{g}{d}{s}" for g in GENDERS for s, ds in STROKES.items() for d in ds]


def round2(x):
    """Half-up rounding to 2 decimals (banker's rounding is unsafe here)."""
    return math.floor(x * 100 + 0.5) / 100.0


# ---------------------------------------------------------------- fetch layer

def fetch(slug, refetch=False):
    path = os.path.join(CACHE_DIR, slug + ".htm")
    if not refetch and os.path.exists(path):
        with open(path, "rb") as f:
            return f.read().decode("shift_jis", errors="replace")
    url = BASE_URL + slug + ".htm"
    proc = subprocess.run(["curl", "-s", "--fail", "--max-time", "30", url],
                          capture_output=True, check=True)
    raw = proc.stdout
    if b"<tr" not in raw.lower():
        raise RuntimeError(f"{slug}: fetched page has no table ({len(raw)} bytes)")
    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(path, "wb") as f:
        f.write(raw)
    time.sleep(FETCH_SLEEP)
    return raw.decode("shift_jis", errors="replace")


# ---------------------------------------------------------------- parse layer

def parse_time(s):
    """-> (sec | None, normalized_string, issues[]).

    Normalization: strip, collapse runs of dots, strip leading/trailing dots.
    A digit-preserving change is flagged "format-fix" (value stays certain).
    """
    issues = []
    stripped = s.strip()
    norm = re.sub(r"\.{2,}", ".", stripped).strip(".")
    if norm != stripped:
        issues.append("format-fix")
    if norm == "":
        return None, norm, issues + ["empty"]
    parts = norm.split(".")
    if not all(p.isdigit() for p in parts):
        return None, norm, issues + ["unparseable"]
    if len(parts) == 1:
        n = int(norm)
        if 20000 <= n <= 59999:
            return None, norm, issues + [f"date-serial:{n}"]
        return None, norm, issues + ["unparseable"]
    if len(parts) == 2:
        whole, frac = parts
        if len(frac) == 2:
            # SS.hh — seconds may exceed 60 (real data: men25Bt 90- '60.92')
            return int(whole) + int(frac) / 100, norm, issues
        # '9.4315' style — parse naively but flag as ambiguous
        return float(norm), norm, issues + ["ambiguous-dots"]
    if len(parts) == 3:
        m, ss, hh = parts
        if len(m) <= 2 and len(ss) <= 2 and int(ss) < 60 and len(hh) == 2:
            return int(m) * 60 + int(ss) + int(hh) / 100, norm, issues
        return None, norm, issues + ["unparseable"]
    if len(parts) == 4:
        h, m, ss, hh = parts
        v = int(h) * 3600 + int(m) * 60 + int(ss) + int(hh) / 100
        # NOTE: contrary to the design doc's assumption, legit >1h times DO
        # exist (men/women 1500Fr 85-89/90- columns, up to ~99 min), so the
        # tag is informational only and is NOT a suspect trigger; genuinely
        # broken 4-part cells are caught by monotonicity/dual-signal anyway.
        return v, norm, issues + ["hour-format"]
    return None, norm, issues + ["unparseable"]


def parse_page(html, slug):
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S | re.I)
    table = []
    for r in rows:
        cells = re.findall(r"<td[^>]*>(.*?)</td>", r, re.S | re.I)
        texts = [re.sub(r"<[^>]+>", "", c).replace("&nbsp;", " ").strip() for c in cells]
        table.append(texts)
    if len(table) < 3 or not table[0]:
        raise RuntimeError(f"{slug}: no usable table rows")
    title = table[0][0]
    header = table[1]
    if not header or header[0] != "級":
        raise RuntimeError(f"{slug}: unexpected header {header[:3]!r}")
    raw_rows = {}
    for row in table[2:]:
        if not row or not row[0].strip().isdigit():
            continue
        g = int(row[0].strip())
        if len(row) < 16:
            raise RuntimeError(f"{slug}: grade {g} row has only {len(row)} cells")
        raw_rows[g] = row[1:16]
    if sorted(raw_rows) != list(range(1, 21)):
        raise RuntimeError(f"{slug}: grades present = {sorted(raw_rows)}")
    return title, raw_rows


# ---------------------------------------------------------------- grid model

def build_grid(event_id, grades, age_labels, raw_rows):
    cells = {}
    for g in grades:
        for a in range(len(age_labels)):
            raw = raw_rows[g][a]
            sec, norm, issues = parse_time(raw)
            cells[(g, a)] = {"raw": raw.strip(), "norm": norm, "sec": sec,
                             "parsed": sec, "issues": list(issues),
                             "locked": False, "keep": False}
    return {"id": event_id, "grades": list(grades), "n": len(age_labels),
            "age_labels": list(age_labels), "cells": cells}


def V(grid, g, a):
    c = grid["cells"].get((g, a))
    return c["sec"] if c else None


def exp_col_impl(grid, g, a):
    """Column model: linear in grade over the two nearest non-null neighbors.

    Two-sided -> proportional interpolation ("interpolation"),
    one-sided (two same-side points) -> extrapolation ("extrapolation").
    Fewer than 2 usable neighbors -> None.
    """
    gs = grid["grades"]
    i = gs.index(g)
    above = [(gs[j], V(grid, gs[j], a)) for j in range(i - 1, -1, -1)]
    above = [(gg, v) for gg, v in above if v is not None]
    below = [(gs[j], V(grid, gs[j], a)) for j in range(i + 1, len(gs))]
    below = [(gg, v) for gg, v in below if v is not None]
    if above and below:
        g1, v1 = above[0]
        g2, v2 = below[0]
        return v1 + (v2 - v1) * (g1 - g) / (g1 - g2), "interpolation"
    pts = above if len(above) >= 2 else (below if len(below) >= 2 else None)
    if pts:
        (g1, v1), (g2, v2) = pts[0], pts[1]
        return v1 + (v2 - v1) * (g - g1) / (g2 - g1), "extrapolation"
    return None


def exp_col(grid, g, a):
    r = exp_col_impl(grid, g, a)
    return r[0] if r else None


def exp_row(grid, g, a):
    """Row model: ratio borrowed from an adjacent grade row (rows are convex
    in age; midpoint over-estimates at the 85-89/90- bend, ratios do not)."""
    n = grid["n"]
    gs = grid["grades"]
    i = gs.index(g)
    gp = gs[i - 1] if i > 0 else None          # one grade better
    gm = gs[i + 1] if i < len(gs) - 1 else None  # one grade worse
    if a == 0:
        if n < 2:
            return None
        base = V(grid, g, 1)
        if base is None:
            return None
        for r in (gp, gm):
            if r is None:
                continue
            va, vb = V(grid, r, 0), V(grid, r, 1)
            if va is not None and vb is not None and vb > 0:
                return base * (va / vb)
        return None
    base = V(grid, g, a - 1)
    if base is not None:
        for r in (gp, gm):
            if r is None:
                continue
            va, vb = V(grid, r, a), V(grid, r, a - 1)
            if va is not None and vb is not None and vb > 0:
                return base * (va / vb)
    if base is not None and a + 1 < n:
        v2 = V(grid, g, a + 1)
        if v2 is not None:
            return (base + v2) / 2   # midpoint fallback
    return None


def dev_of(x, exp):
    if x is None or exp is None or exp <= 0:
        return None
    return abs(x - exp) / exp


def min_dev(grid, g, a):
    c = grid["cells"][(g, a)]
    if c["sec"] is None:
        return math.inf   # null anomalies are repaired first
    dc = dev_of(c["sec"], exp_col(grid, g, a))
    dr = dev_of(c["sec"], exp_row(grid, g, a))
    ds = [d for d in (dc, dr) if d is not None]
    return min(ds) if ds else 0.0


# ---------------------------------------------------------------- detection

def violations(grid):
    """(A) column-monotonicity violations: both participants are suspects."""
    out = set()
    for a in range(grid["n"]):
        prev = None
        for g in grid["grades"]:
            v = V(grid, g, a)
            if v is None:
                continue
            if prev is not None and v <= prev[1]:
                out.add((prev[0], a))
                out.add((g, a))
            prev = (g, v)
    return out


def column_all_null(grid, a):
    return all(V(grid, g, a) is None for g in grid["grades"])


ISSUE_SUSPECTS = ("ambiguous-dots", "date-serial")


def find_suspects(grid):
    sus = set(violations(grid))
    for a in range(grid["n"]):
        all_null = column_all_null(grid, a)
        for g in grid["grades"]:
            c = grid["cells"][(g, a)]
            if c["locked"] or c["keep"]:
                continue
            if c["sec"] is None:
                if not all_null:          # isolated null (whole-null column is legit)
                    sus.add((g, a))
                continue
            if any(i.startswith(p) for i in c["issues"] for p in ISSUE_SUSPECTS):
                sus.add((g, a))
                continue
            # (B) dual-signal scan: every available signal deviates >= 4%
            dc = dev_of(c["sec"], exp_col(grid, g, a))
            dr = dev_of(c["sec"], exp_row(grid, g, a))
            present = [d for d in (dc, dr) if d is not None]
            if present and all(d >= DEV_SUSPECT for d in present):
                sus.add((g, a))
    return {ga for ga in sus
            if not grid["cells"][ga]["locked"] and not grid["cells"][ga]["keep"]}


# ---------------------------------------------------------------- candidates

def redot_candidates(norm):
    """Strip dots, re-insert to match valid patterns SS.hh / M.SS.hh / MM.SS.hh
    (SS<60, hh exactly 2 digits) or bare SS<60."""
    digits = re.sub(r"\D", "", norm)
    out = set()
    L = len(digits)
    if L in (1, 2) and digits:
        v = int(digits)
        if v < 60:
            out.add(float(v))
    if L in (3, 4):
        ss, hh = digits[:-2], digits[-2:]
        if int(ss) < 60:
            out.add(int(ss) + int(hh) / 100)
    if L in (5, 6):
        m, ss, hh = digits[:-4], digits[-4:-2], digits[-2:]
        if int(ss) < 60:
            out.add(int(m) * 60 + int(ss) + int(hh) / 100)
    return out


def date_decode(serial):
    """Excel serial -> the 'G.MM.DD' (wareki-like = M.SS.hh) time Excel ate.
    Guards: minutes 1..59 AND date before the Reiwa era."""
    d = EXCEL_EPOCH + timedelta(days=serial)
    g_min = d.year - 1988
    if not (1 <= g_min <= 59):
        return None
    if d >= REIWA_START:
        return None   # Reiwa range guard
    return g_min * 60 + d.month + d.day / 100


def digit_variants(norm):
    """Every single-digit substitution + adjacent-digit transposition of the
    raw (normalized) string, re-parsed. -> {value: 'digit-fix'|'transpose'}"""
    variants = []
    chars = list(norm)
    for i, ch in enumerate(chars):
        if not ch.isdigit():
            continue
        for d in "0123456789":
            if d != ch:
                variants.append(("".join(chars[:i] + [d] + chars[i + 1:]), "digit-fix"))
    for i in range(len(chars) - 1):
        if chars[i].isdigit() and chars[i + 1].isdigit() and chars[i] != chars[i + 1]:
            variants.append(("".join(chars[:i] + [chars[i + 1], chars[i]] + chars[i + 2:]),
                             "transpose"))
    res = {}
    for s, kind in variants:
        sec, _, issues = parse_time(s)
        if sec is None or issues:
            continue                      # only clean re-parses are valid times
        if sec not in res:                # substitutions enumerated first
            res[sec] = kind
    return res


# ---------------------------------------------------------------- repair

def hard_bounds(grid, g, a):
    gs = grid["grades"]
    i = gs.index(g)
    lo = -math.inf
    for j in range(i - 1, -1, -1):
        v = V(grid, gs[j], a)
        if v is not None:
            lo = v
            break
    hi = math.inf
    for j in range(i + 1, len(gs)):
        v = V(grid, gs[j], a)
        if v is not None:
            hi = v
            break
    return lo, hi


def row_bound(grid, g, a):
    if a - 1 < 0 or a + 1 >= grid["n"]:
        return None
    v1, v2 = V(grid, g, a - 1), V(grid, g, a + 1)
    if v1 is not None and v2 is not None and v1 < v2:
        return (v1, v2)
    return None   # ties / 18-24 boundary inversions: skip the row bound


def repair_cell(grid, g, a, overrides, repairs, kept):
    c = grid["cells"][(g, a)]
    labels = grid["age_labels"]
    ec = exp_col(grid, g, a)
    er = exp_row(grid, g, a)
    pre_dc = dev_of(c["sec"], ec)
    pre_dr = dev_of(c["sec"], er)
    pre = [d for d in (pre_dc, pre_dr) if d is not None]
    pre_min = min(pre) if pre else None   # None for null-valued cells
    lo, hi = hard_bounds(grid, g, a)
    rb = row_bound(grid, g, a)

    def ok(cand, check_col=True):
        if cand <= 0 or not (lo < cand < hi):
            return False
        if rb and not (rb[0] < cand < rb[1]):
            return False
        if check_col:
            d = dev_of(cand, ec)
            if d is not None and d > DEV_ACCEPT:
                return False
        d = dev_of(cand, er)
        if d is not None and d > DEV_ACCEPT:
            return False
        return True

    def commit(cand, method):
        val = None if cand is None else round2(cand)
        repairs.append({
            "event": grid["id"], "grade": g, "age": labels[a],
            "raw": c["raw"], "parsed": c["parsed"], "repaired": val,
            "method": method,
            "expCol": round2(ec) if ec is not None else None,
            "expRow": round2(er) if er is not None else None,
            "_preMinDev": pre_min, "_ageIdx": a,
        })
        c["sec"] = val
        c["locked"] = True
        c["issues"] = []
        return True

    # 0. override wins over all generators
    okey = f"{grid['id']}:{g}:{labels[a]}"
    if okey in overrides:
        return commit(overrides[okey], "override")

    def pick_best(cand_map):
        best = None
        for v, kind in cand_map.items():
            v2 = round2(v)
            if c["parsed"] is not None and v2 == round2(c["parsed"]):
                continue
            if not ok(v2):
                continue
            dc = dev_of(v2, ec)
            dr = dev_of(v2, er)
            score = (dc or 0.0) + (dr or 0.0)
            tie = abs(v2 - c["parsed"]) if c["parsed"] is not None else 0.0
            key = (score, tie)
            if best is None or key < best[0]:
                best = (key, v2, kind)
        return best

    # 1. redot (ambiguous-dots only)
    if "ambiguous-dots" in c["issues"]:
        b = pick_best({v: "redot" for v in redot_candidates(c["norm"])})
        if b:
            return commit(b[1], "redot")

    # 2. date-decode (date-serial only)
    serial = next((int(i.split(":", 1)[1]) for i in c["issues"]
                   if i.startswith("date-serial")), None)
    if serial is not None:
        v = date_decode(serial)
        if v is not None and ok(round2(v)):
            return commit(v, "date-decode")

    # 3. digit-fix / transpose
    if c["norm"]:
        b = pick_best(digit_variants(c["norm"]))
        if b:
            return commit(b[1], b[2])

    # 4. interpolation / extrapolation (column fit by construction)
    r = exp_col_impl(grid, g, a)
    if r is not None:
        v2 = round2(r[0])
        if (c["parsed"] is None or v2 != round2(c["parsed"])) and ok(v2, check_col=False):
            return commit(v2, r[1])

    # failure
    if c["sec"] is None or (g, a) in violations(grid):
        return commit(None, "nulled")
    c["keep"] = True   # leave value, list for human review
    kept.append({"event": grid["id"], "grade": g, "age": labels[a],
                 "raw": c["raw"], "sec": c["sec"],
                 "devCol": pre_dc, "devRow": pre_dr, "_ga": (g, a)})
    return False


def detect_and_repair(grid, overrides, repairs, kept):
    # pre-pass: apply overrides even if the pinned cell would not be flagged
    labels = grid["age_labels"]
    local_kept = []
    for g in grid["grades"]:
        for a in range(grid["n"]):
            if f"{grid['id']}:{g}:{labels[a]}" in overrides \
                    and not grid["cells"][(g, a)]["locked"]:
                repair_cell(grid, g, a, overrides, repairs, local_kept)
    done = False
    for _ in range(MAX_ITER):
        sus = find_suspects(grid)
        if not sus:
            done = True
            break
        # one repair per iteration; recompute everything afterwards
        g, a = max(sorted(sus), key=lambda ga: (min_dev(grid, *ga), ga[0], -ga[1]))
        repair_cell(grid, g, a, overrides, repairs, local_kept)
    if not done:
        raise RuntimeError(f"{grid['id']}: repair loop did not converge in {MAX_ITER} iterations")
    # exoneration pass: a clean cell can be picked while its expectations are
    # still contaminated by a broken neighbor (repair then rightly fails and
    # the value is kept). Once the neighbor is fixed, re-evaluate: if the cell
    # is no longer suspect-worthy it was clean all along — drop it from the
    # human-review list ("the clean one survives").
    vio = violations(grid)
    for k in local_kept:
        g, a = k["_ga"]
        c = grid["cells"][(g, a)]
        dc = dev_of(c["sec"], exp_col(grid, g, a))
        dr = dev_of(c["sec"], exp_row(grid, g, a))
        present = [d for d in (dc, dr) if d is not None]
        still = (g, a) in vio or (present and all(d >= DEV_SUSPECT for d in present))
        if still:
            k["devCol"], k["devRow"] = dc, dr   # post-repair deviations
            kept.append(k)
        else:
            c["keep"] = False


def record_format_fixes(grid, repairs):
    """Digit-preserving normalizations: audited but値は確定 (not 推定値)."""
    for g in grid["grades"]:
        for a in range(grid["n"]):
            c = grid["cells"][(g, a)]
            if "format-fix" in c["issues"]:
                c["issues"].remove("format-fix")
                if c["sec"] is not None and not c["issues"]:
                    repairs.append({
                        "event": grid["id"], "grade": g, "age": grid["age_labels"][a],
                        "raw": c["raw"], "parsed": c["sec"], "repaired": c["sec"],
                        "method": "format-fix", "expCol": None, "expRow": None,
                        "_preMinDev": None, "_ageIdx": a,
                    })


# ---------------------------------------------------------------- pipeline

def load_overrides():
    if not os.path.exists(OVERRIDES_PATH):
        return {}
    with open(OVERRIDES_PATH, encoding="utf-8") as f:
        return json.load(f)


def run_pipeline(refetch=False, verbose=True):
    overrides = load_overrides()
    repairs, kept, events = [], [], []
    for gender in GENDERS:
        for stroke, dists in STROKES.items():
            for dist in dists:
                slug = f"{gender}{dist}{stroke}"
                html = fetch(slug, refetch)
                title, raw_rows = parse_page(html, slug)
                grid = build_grid(slug, GRADES, AGE_GROUPS, raw_rows)
                record_format_fixes(grid, repairs)
                detect_and_repair(grid, overrides, repairs, kept)
                events.append({"grid": grid, "title": title,
                               "gender": "M" if gender == "men" else "F",
                               "stroke": stroke, "distance": dist})
                if verbose:
                    print(f"ok {slug}: {title}", file=sys.stderr)
    return events, repairs, kept, overrides


def utc_now_str():
    try:
        r = subprocess.run(["date", "-u", "+%Y-%m-%dT%H:%M:%SZ"],
                           capture_output=True, text=True, check=True)
        s = r.stdout.strip()
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", s):
            return s
    except Exception:
        pass
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _is_estimated(r):
    """format-fix keeps the source digits; a confirm-override (human pinned
    the cell to its own parsed value) is source data too — neither is 推定値."""
    if r["method"] == "format-fix":
        return False
    if r["method"] == "override" and r["repaired"] == r["parsed"]:
        return False
    return True


def build_output(events, repairs):
    est = {}
    for r in repairs:
        if _is_estimated(r):
            est.setdefault(r["event"], set()).add((r["grade"], r["_ageIdx"]))
    out_events = []
    for ev in events:
        grid = ev["grid"]
        times = [[round2(V(grid, g, a)) if V(grid, g, a) is not None else None
                  for a in range(15)] for g in GRADES]
        e = {"id": grid["id"], "title": ev["title"], "gender": ev["gender"],
             "stroke": ev["stroke"], "distance": ev["distance"], "times": times}
        pairs = sorted(est.get(grid["id"], ()), key=lambda p: (20 - p[0], p[1]))
        if pairs:
            e["estimated"] = [[g, a] for g, a in pairs]
        out_events.append(e)
    repairs_out = [{k: v for k, v in r.items() if not k.startswith("_")}
                   for r in repairs]
    return {"schemaVersion": 1, "source": BASE_URL, "sourceName": SOURCE_NAME,
            "fetchedAt": utc_now_str(), "ageGroups": AGE_GROUPS, "grades": GRADES,
            "events": out_events, "repairs": repairs_out}


# ---------------------------------------------------------------- validation

GOLDEN_SPOT_CHECKS = [
    ("men50Fr", 20, "25-29", 22.29),
    ("women200IM", 20, "60-64", 193.0),
    ("women50Bc", 4, "70-74", 67.05),
    ("men800Fr", 15, "35-39", 583.15),
    ("women400IM", 2, "18-24", 477.0),
]


def _matrix_bounds(times, grade, a):
    ri = 20 - grade
    lo = -math.inf
    for r in range(ri - 1, -1, -1):
        if times[r][a] is not None:
            lo = times[r][a]
            break
    hi = math.inf
    for r in range(ri + 1, 20):
        if times[r][a] is not None:
            hi = times[r][a]
            break
    return lo, hi


def validate(data, emitted):
    """Hard asserts (Section 7). Returns (checks, warnings); a check is
    (name, passed, detail)."""
    checks, warnings = [], []
    events = data["events"]
    by_id = {e["id"]: e for e in events}
    repairs = data["repairs"]

    expected_ids = set(all_slugs())
    ok1 = len(events) == 44 and len(by_id) == 44 and set(by_id) == expected_ids
    checks.append(("1. 44 events / unique / expected id set", ok1,
                   f"{len(events)} events"))

    ok2 = data["grades"] == list(range(20, 0, -1)) and all(
        len(e["times"]) == 20 and all(len(row) == 15 for row in e["times"])
        for e in events)
    checks.append(("2. grades 20..1 / 20x15 matrix per event", ok2, ""))

    bad3 = []
    for e in events:
        for a in range(15):
            seq = [row[a] for row in e["times"] if row[a] is not None]
            for i in range(1, len(seq)):
                if seq[i] <= seq[i - 1]:
                    bad3.append(f"{e['id']}:{AGE_GROUPS[a]}")
    checks.append(("3. post-repair column monotonicity (strict, gap-aware)",
                   not bad3, "; ".join(bad3[:5])))

    # NOTE: design said 4000s, but its own calibration data holds legitimate
    # times up to 5948.23s (men1500Fr grade1 90-), so the cap is 6000s.
    bad4 = [f"{e['id']}={row[a]}" for e in events for row in e["times"]
            for a in range(15)
            if row[a] is not None and not (10.0 <= row[a] <= 6000.0)]
    checks.append(("4. sane range [10.0, 6000.0]", not bad4, "; ".join(bad4[:5])))

    nulled = {(r["event"], r["grade"], r["age"]) for r in repairs
              if r["repaired"] is None and r["method"] in ("nulled", "override")}
    bad5 = []
    for e in events:
        for a in range(15):
            col_all_null = all(row[a] is None for row in e["times"])
            for ri, row in enumerate(e["times"]):
                if row[a] is None and not col_all_null \
                        and (e["id"], 20 - ri, AGE_GROUPS[a]) not in nulled:
                    bad5.append(f"{e['id']}:{20 - ri}:{AGE_GROUPS[a]}")
    checks.append(("5. null discipline (whole-column or 'nulled')", not bad5,
                   "; ".join(bad5[:5])))

    bad6 = []
    for r in repairs:
        e = by_id.get(r["event"])
        a = AGE_GROUPS.index(r["age"])
        if r["method"] not in ("format-fix", "nulled", "override") \
                and r["repaired"] == r["parsed"]:
            bad6.append(f"{r['event']}:{r['grade']}:{r['age']} repaired==parsed")
        if r["repaired"] is not None:
            lo, hi = _matrix_bounds(e["times"], r["grade"], a)
            if not (lo < r["repaired"] < hi):
                bad6.append(f"{r['event']}:{r['grade']}:{r['age']} out of bounds")
        is_est = not (r["method"] == "format-fix"
                      or (r["method"] == "override" and r["repaired"] == r["parsed"]))
        if is_est and [r["grade"], a] not in e.get("estimated", []):
            bad6.append(f"{r['event']}:{r['grade']}:{r['age']} not in estimated")
    checks.append(("6. repair entries consistent (value, bounds, estimated flag)",
                   not bad6, "; ".join(bad6[:5])))

    n = len(repairs)
    if not (25 <= n <= 40):
        warnings.append(f"drift guard: repairs count {n} outside 25..40 "
                        "(source may have changed since calibration)")
    checks.append(("7. drift guard 25..40 repairs (warn-only)", True,
                   f"{n} repairs"))

    bad8 = []
    for ev_id, grade, age, want in GOLDEN_SPOT_CHECKS:
        got = by_id[ev_id]["times"][20 - grade][AGE_GROUPS.index(age)]
        if got is None or abs(got - want) > 0.005:
            bad8.append(f"{ev_id}:{grade}:{age} = {got} (want {want})")
    checks.append(("8. golden spot-checks", not bad8, "; ".join(bad8)))

    try:
        json.loads(emitted)
        ok9 = True
    except Exception:
        ok9 = False
    checks.append(("9. JSON round-trip", ok9, f"{len(emitted)} bytes"))
    return checks, warnings


# ---------------------------------------------------------------- report

def _fmt(v, pct=False):
    if v is None:
        return "―"
    if v is math.inf:
        return "∞"
    if pct:
        return f"{v * 100:.1f}%"
    return f"{v:.2f}"


# 適用中 override の根拠（レポートに明記する）
OVERRIDE_NOTES = {
    "women800Fr:20:40-44":
        "40-44列は g20=588 / g19=585 の単調性違反ペア。列の等差パターン"
        "（g20→g18 が等差 s、g17 で 2s。例: 30-34列 5.67/5.67/11.34、45-49列 "
        "6.2/6.2/12.4）から壊れているのは g19（真値 594）。しかしトップ端では "
        "g20 の両シグナルが g19 を経由して汚染され minDev が僅差で逆転"
        "（1.539% vs 1.515%）、自動修復が g20 側 (588→578) に誤帰属する。"
        "そのため g20 を原値 588.0 に確認ピン → g19 が transpose "
        "9.45.00→9.54.00=594.00 で正しく修復される（設計書の正解表どおり）。",
}


def build_report(data, repairs, kept, checks, warnings, overrides):
    counts = {}
    for r in repairs:
        counts[r["method"]] = counts.get(r["method"], 0) + 1
    L = []
    L.append("# swimrank 修復レポート")
    L.append("")
    L.append(f"- 生成日時: {data['fetchedAt']}")
    L.append(f"- ソース: {data['source']}（{data['sourceName']}）")
    L.append("")
    if overrides:
        L.append("## 適用中の overrides（人手ピン）")
        L.append("")
        for k, v in overrides.items():
            L.append(f"- `{k}` = {v}")
            note = OVERRIDE_NOTES.get(k)
            if note:
                L.append(f"  - 根拠: {note}")
        L.append("")
    L.append("## サマリ（方法別件数）")
    L.append("")
    L.append(f"- 修復合計: **{len(repairs)} 件**")
    for m in sorted(counts, key=lambda m: -counts[m]):
        L.append(f"  - {m}: {counts[m]}")
    L.append(f"- 未修復サスペクト（値は保持・要人手レビュー）: {len(kept)} 件")
    L.append("")
    L.append("## 修復一覧")
    L.append("")
    L.append("| event | 級 | 年齢区分 | raw | parsed | repaired | method | expCol | expRow | 修復前minDev |")
    L.append("|---|---|---|---|---|---|---|---|---|---|")
    for r in repairs:
        L.append("| {event} | {grade} | {age} | `{raw}` | {p} | {rep} | {method} | {ec} | {er} | {dev} |".format(
            event=r["event"], grade=r["grade"], age=r["age"],
            raw=r["raw"] if r["raw"] else " ",
            p=_fmt(r["parsed"]), rep=_fmt(r["repaired"]), method=r["method"],
            ec=_fmt(r["expCol"]), er=_fmt(r["expRow"]),
            dev=_fmt(r["_preMinDev"], pct=True) if r["_preMinDev"] is not None else "―"))
    L.append("")
    L.append("## 未修復サスペクト")
    L.append("")
    if kept:
        L.append("| event | 級 | 年齢区分 | raw | 値 | devCol | devRow |")
        L.append("|---|---|---|---|---|---|---|")
        for k in kept:
            L.append(f"| {k['event']} | {k['grade']} | {k['age']} | `{k['raw']}` "
                     f"| {_fmt(k['sec'])} | {_fmt(k['devCol'], pct=True)} "
                     f"| {_fmt(k['devRow'], pct=True)} |")
    else:
        L.append("なし。")
    L.append("")
    L.append("## 最弱修復（修復前 minDev < 5% — 判定根拠が薄い修復）")
    L.append("")
    weak = [r for r in repairs
            if r["_preMinDev"] is not None and r["_preMinDev"] < 0.05
            and r["method"] != "format-fix"]
    if weak:
        for r in weak:
            L.append(f"- {r['event']} {r['grade']}級 {r['age']}: `{r['raw']}` "
                     f"({_fmt(r['parsed'])}) → {_fmt(r['repaired'])} [{r['method']}] "
                     f"修復前minDev {_fmt(r['_preMinDev'], pct=True)}。"
                     f"疑わしい場合は overrides.json で "
                     f"`\"{r['event']}:{r['grade']}:{r['age']}\": {r['parsed']}` を指定して固定できる。")
    else:
        L.append("なし。")
    L.append("")
    L.append("## 検証チェックリスト")
    L.append("")
    for name, passed, detail in checks:
        mark = "x" if passed else " "
        suffix = f" — {detail}" if detail else ""
        L.append(f"- [{mark}] {name}{suffix}")
    if warnings:
        L.append("")
        L.append("### 警告")
        for w in warnings:
            L.append(f"- {w}")
    L.append("")
    return "\n".join(L)


# ---------------------------------------------------------------- ground truth
# 設計書セクション4の正解表を実データで検証した確定版 golden set:
#   (event, grade, age, repaired, method)
#
# 設計書の表からの確認済み差分（いずれも実ソースの生文字列を確認して解決）:
#  * women800Fr 19 40-44: 設計書どおり 594.00/transpose。ただし相方の g20=588
#    はトップ端で両シグナルが壊れた g19 を経由するため minDev の綱引きが僅差で
#    逆転する（1.539% vs 1.515%）。設計書が用意した人手レバー overrides.json で
#    g20 を原値 588.0 にピン（confirm-override）→ g19 が transpose で正しく直る。
#  * women100Bc 5 90-: 実 raw は "60.9.78"（設計書想定 "1.00.09.78" と異なる）。
#    transpose "06.9.78"=369.78 が成立し、設計書自身が「true value likely 369.78」
#    とする値を回復。interpolation 370.22 より正確なので golden を更新。
#  * women200Br 9 40-44: 実 raw は "3.48..60"（null ではない）。format-fix で
#    確定値 228.60。設計書の interpolation 228.61 は不要になった。
#  * women400IM 2 18-24: 実 raw は "7.87.00"（設計書想定 "8.27.00" と異なる）。
#    digit-fix "7.57.00"=477.00 が成立（値は設計書と同一、方法のみ変更）。
#  * 追加検出 2 件（設計書の表は「~27件」概算で網羅していなかった）:
#    men200Fr 1 50-54 (3.47.96=227.96, 列等差+行比の両シグナル4.9%逸脱) → 217.96、
#    women200Bc 4 30-34 (3.26.05=206.05, 単調性違反) → 216.05 = 中点ぴったり。

GROUND_TRUTH = [
    ("men50Fr", 20, "25-29", 22.29, "digit-fix"),
    ("men50Fr", 9, "40-44", 31.11, "digit-fix"),
    ("men100Fr", 1, "45-49", 93.48, "digit-fix"),
    ("men200Fr", 1, "50-54", 217.96, "digit-fix"),      # addition (dual-signal 4.9%)
    ("men400Fr", 7, "40-44", 356.40, "digit-fix"),
    ("men800Fr", 15, "35-39", 583.15, "redot"),
    ("men800Fr", 4, "60-64", 983.40, "digit-fix"),
    ("men200Bc", 12, "35-39", 155.44, "transpose"),
    ("men200IM", 7, "55-59", 217.35, "digit-fix"),
    ("women400Fr", 17, "18-24", 271.32, "digit-fix"),
    ("women400Fr", 6, "18-24", 369.74, "digit-fix"),
    ("women400Fr", 4, "25-29", 399.32, "digit-fix"),
    ("women800Fr", 20, "40-44", 588.00, "override"),    # confirm-override (see above)
    ("women800Fr", 19, "40-44", 594.00, "transpose"),
    ("women800Fr", 1, "35-39", 943.00, "digit-fix"),
    ("women100Bc", 2, "80-84", 206.70, "digit-fix"),
    ("women100Bc", 5, "90-", 369.78, "transpose"),      # was 370.22 interpolation
    ("women200Bc", 4, "30-34", 216.05, "digit-fix"),    # addition (violation)
    ("women50Bc", 4, "70-74", 67.05, "date-decode"),
    ("women50Bc", 3, "70-74", 69.30, "date-decode"),
    ("women200Br", 9, "40-44", 228.60, "format-fix"),   # was 228.61 interpolation
    ("women200Br", 2, "50-54", 302.10, "digit-fix"),
    ("women100Bt", 4, "18-24", 93.87, "digit-fix"),
    ("women200Bt", 1, "50-54", 295.20, "digit-fix"),
    ("women200Bt", 3, "55-59", 303.38, "digit-fix"),
    ("women200IM", 20, "60-64", 193.00, "digit-fix"),
    ("women200IM", 17, "35-39", 157.08, "digit-fix"),
    ("women200IM", 4, "45-49", 248.83, "digit-fix"),
    ("women400IM", 13, "30-34", 361.60, "digit-fix"),
    ("women400IM", 10, "65-69", 565.80, "digit-fix"),
    ("women400IM", 2, "18-24", 477.00, "digit-fix"),    # was interpolation
    ("women50Fr", 1, "85-89", 114.85, "digit-fix"),
    ("women200Fr", 11, "70-74", 243.95, "format-fix"),  # '.4.03.95'
]


# ---------------------------------------------------------------- self tests

def _approx(a, b, tol=1e-9):
    return a is not None and b is not None and abs(a - b) < tol


def _synth_grid(event_id, grades, raws):
    """raws: {grade: [raw string per age]}."""
    n = len(next(iter(raws.values())))
    labels = [str(a) for a in range(n)]
    return build_grid(event_id, grades, labels, raws)


def run_tests():
    # --- parse_time -----------------------------------------------------
    def pt(s):
        return parse_time(s)

    sec, _, iss = pt("21.80"); assert _approx(sec, 21.80) and iss == [], (sec, iss)
    sec, _, iss = pt("1.00.71"); assert _approx(sec, 60.71) and iss == []
    sec, _, iss = pt("2.17.20"); assert _approx(sec, 137.20) and iss == []
    sec, _, iss = pt(""); assert sec is None and iss == ["empty"]
    sec, norm, iss = pt(".4.03.95")
    assert _approx(sec, 243.95) and iss == ["format-fix"] and norm == "4.03.95"
    sec, norm, iss = pt("3.48..60")
    assert _approx(sec, 228.60) and iss == ["format-fix"] and norm == "3.48.60"
    sec, _, iss = pt("60.92"); assert _approx(sec, 60.92) and iss == []
    sec, _, iss = pt("9.4315"); assert _approx(sec, 9.4315) and iss == ["ambiguous-dots"]
    sec, _, iss = pt("32694"); assert sec is None and iss == ["date-serial:32694"]
    sec, _, iss = pt("1.00.09.78"); assert _approx(sec, 3609.78) and iss == ["hour-format"]
    print("ok parse_time", file=sys.stderr)

    # --- redot ----------------------------------------------------------
    cands = redot_candidates("9.4315")
    assert len(cands) == 1 and _approx(next(iter(cands)), 583.15), cands
    print("ok redot", file=sys.stderr)

    # --- date-decode ----------------------------------------------------
    assert _approx(date_decode(32694), 67.05)
    assert _approx(date_decode(32781), 69.30)
    assert date_decode(45000) is None   # Reiwa range guard
    print("ok date-decode", file=sys.stderr)

    # --- digit candidates ------------------------------------------------
    vs = digit_variants("20.29")
    assert any(_approx(v, 22.29) for v in vs), vs
    vs = digit_variants("2.53.44")
    hits = [k for v, k in vs.items() if _approx(v, 155.44)]
    assert hits == ["transpose"], vs
    print("ok digit variants", file=sys.stderr)

    # --- expected values --------------------------------------------------
    col = [10.0, 12.0, 14.0, 16.0, 18.0, 20.0]   # grades 6..1
    raws = {g: [f"{col[i] + a:.2f}" for a in range(3)]
            for i, g in enumerate(range(6, 0, -1))}
    gr = _synth_grid("t", list(range(6, 0, -1)), raws)
    assert _approx(exp_col(gr, 4, 0), 14.0)          # interior midpoint
    assert _approx(exp_col(gr, 6, 0), 10.0)          # edge extrapolation
    assert _approx(exp_col(gr, 1, 0), 20.0)          # edge extrapolation
    gr["cells"][(4, 0)]["sec"] = None                # gap: g4,g3 null
    gr["cells"][(3, 0)]["sec"] = None
    assert _approx(exp_col(gr, 4, 0), 12.0 + (18.0 - 12.0) / 3)   # skip nulls
    for g in (6, 5, 4, 2):
        gr["cells"][(g, 0)]["sec"] = None            # only g1 left in the column
    assert exp_col(gr, 3, 0) is None                 # <2 usable neighbors
    print("ok expected()", file=sys.stderr)

    # --- detect_and_repair on synthetic grid ------------------------------
    R = {6: 20.0, 5: 22.0, 4: 24.0, 3: 26.0, 2: 28.0, 1: 30.0}
    C = [1.0, 1.1, 1.2, 1.3, 1.4]
    raws = {g: [f"{R[g] * C[a]:.2f}" for a in range(5)] for g in range(6, 0, -1)}
    raws[3][4] = ""        # isolated null            -> interpolation 36.40
    raws[4][1] = "2.640"   # ambiguous dots (26.40)   -> redot
    raws[4][2] = "18.80"   # digit typo (28.80)       -> digit-fix
    raws[1][3] = "93.00"   # transposed (39.00)       -> transpose
    gr = _synth_grid("synth", list(range(6, 0, -1)), raws)
    reps, kept = [], []
    detect_and_repair(gr, {}, reps, kept)
    got = {(r["grade"], r["_ageIdx"]): (r["repaired"], r["method"]) for r in reps}
    assert got == {(3, 4): (36.40, "interpolation"),
                   (4, 1): (26.40, "redot"),
                   (4, 2): (28.80, "digit-fix"),
                   (1, 3): (39.00, "transpose")}, got
    assert not kept
    # contamination: clean cells adjacent to planted typos survive untouched
    for g, a in [(5, 1), (3, 1), (5, 2), (3, 2), (2, 2), (4, 0)]:
        c = gr["cells"][(g, a)]
        assert not c["locked"] and _approx(c["sec"], R[g] * C[a]), (g, a, c)
    assert not violations(gr)
    print("ok detect_and_repair (synthetic)", file=sys.stderr)

    # --- offline full pipeline vs. ground truth ---------------------------
    missing = [s for s in all_slugs()
               if not os.path.exists(os.path.join(CACHE_DIR, s + ".htm"))]
    if missing:
        print(f"skip offline pipeline test (cache incomplete: {len(missing)} pages missing)",
              file=sys.stderr)
        print("SELF-TESTS PASSED (offline pipeline test skipped)", file=sys.stderr)
        return 0

    events, repairs, kept, _ = run_pipeline(refetch=False, verbose=False)
    data = build_output(events, repairs)
    emitted = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    checks, warnings = validate(data, emitted)
    for name, passed, detail in checks:
        assert passed, f"validation failed: {name} — {detail}"
    by_id = {e["id"]: e for e in data["events"]}
    by_key = {(r["event"], r["grade"], r["age"]): r for r in repairs}
    assert len(by_key) == len(repairs), "duplicate repair entries"
    for ev_id, grade, age, want, method in GROUND_TRUTH:
        r = by_key.get((ev_id, grade, age))
        assert r is not None, f"missing repair {ev_id}:{grade}:{age}"
        assert _approx(r["repaired"], want, 0.005), \
            f"{ev_id}:{grade}:{age} repaired={r['repaired']} want={want}"
        assert r["method"] == method, \
            f"{ev_id}:{grade}:{age} method={r['method']} want={method}"
        got = by_id[ev_id]["times"][20 - grade][AGE_GROUPS.index(age)]
        assert _approx(got, want, 0.005), f"{ev_id}:{grade}:{age} matrix={got}"
    # bijection: no repairs beyond the golden set either
    gt_keys = {(e, g, a) for e, g, a, _, _ in GROUND_TRUTH}
    extras = sorted(set(by_key) - gt_keys)
    assert not extras, f"repairs not in ground truth: {extras}"
    n_ff = sum(1 for r in repairs if r["method"] == "format-fix")
    assert 25 <= len(repairs) <= 40, len(repairs)
    print(f"ok offline pipeline: ground truth {len(GROUND_TRUTH)}/{len(GROUND_TRUTH)} "
          f"matched (bijection), repairs={len(repairs)} (format-fix {n_ff}), "
          f"kept={len(kept)}", file=sys.stderr)
    print("SELF-TESTS PASSED", file=sys.stderr)
    return 0


# ---------------------------------------------------------------- main

def main(argv):
    if "--test" in argv:
        return run_tests()
    refetch = "--refetch" in argv
    events, repairs, kept, overrides = run_pipeline(refetch=refetch)
    data = build_output(events, repairs)
    emitted = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    checks, warnings = validate(data, emitted)
    report = build_report(data, repairs, kept, checks, warnings, overrides)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(report)
    print("\n" + report, file=sys.stderr)
    if not all(passed for _, passed, _ in checks):
        print("VALIDATION FAILED — src/data/sikaku.json は書き出しません", file=sys.stderr)
        return 1
    os.makedirs(os.path.dirname(OUT_JSON_PATH), exist_ok=True)
    with open(OUT_JSON_PATH, "w", encoding="utf-8") as f:
        f.write(emitted)
    assert os.path.getsize(REPORT_PATH) > 0
    print(f"\nwrote {OUT_JSON_PATH} ({len(emitted.encode('utf-8'))} bytes)",
          file=sys.stderr)
    print(f"wrote {REPORT_PATH}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
