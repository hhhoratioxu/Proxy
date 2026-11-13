#!/usr/bin/env python3
"""Check the reviewed domain intersections; never change matchers or policies."""

import json
from pathlib import Path

from validate_rules import ROOT, GROUPS, read_rules

CATALOG = ROOT / "tools/reviewed-domain-overlaps.json"


def intersections(root=ROOT):
    exact, suffix = {}, {}
    rules = []
    for group in GROUPS:
        for rule in read_rules(root / "Loon/rule" / (group + ".lsr"), "Loon"):
            if rule.kind not in {"DOMAIN", "DOMAIN-SUFFIX"}:
                continue
            item = (group, rule.kind, rule.value)
            rules.append(item)
            target = exact if rule.kind == "DOMAIN" else suffix
            target.setdefault(rule.value, []).append(item)
    found = set()
    for item in rules:
        group, kind, value = item
        labels = value.split(".")
        candidates = list(exact.get(value, ())) if kind == "DOMAIN" else []
        for offset in range(len(labels)):
            candidates.extend(suffix.get(".".join(labels[offset:]), ()))
        for other in candidates:
            if other[0] != group:
                found.add(tuple(sorted((item, other))))
    return found


def catalog_key(entry):
    return tuple(sorted((m["group"], m["kind"], m["value"]) for m in entry["matchers"]))


def audit(root=ROOT, catalog_path=CATALOG):
    entries = json.loads(catalog_path.read_text())["intersections"]
    reviewed = {catalog_key(entry) for entry in entries}
    actual = intersections(root)
    problems = []
    if len(entries) != len(reviewed):
        problems.append("duplicate reviewed intersection")
    for key in sorted(actual - reviewed):
        problems.append("unreviewed domain intersection: " + repr(key))
    for key in sorted(reviewed - actual):
        problems.append("stale reviewed domain intersection: " + repr(key))
    return {"intersections": len(actual), "problems": problems}


if __name__ == "__main__":
    report = audit()
    print(str(report["intersections"]) + " reviewed domain intersections / " + str(len(report["problems"])) + " problems")
    for problem in report["problems"]:
        print("FAIL: " + problem)
    raise SystemExit(bool(report["problems"]))
