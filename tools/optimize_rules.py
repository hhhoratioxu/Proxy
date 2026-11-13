#!/usr/bin/env python3
"""Apply the reviewed, pinned routing policy; never fetch or auto-merge sources."""

import argparse
from collections import defaultdict
from dataclasses import replace
import hashlib
import ipaddress
import json
from pathlib import Path
import re

from validate_rules import ROOT, CLIENTS, GROUPS, EG_KEYS, IP_TYPES, Rule, read_rules

POLICY = ROOT / "tools/official-routing-policy.json"


def format_rule(rule, client):
    kind = rule.kind
    if client == "QuantumultX":
        kind = {"DOMAIN": "HOST", "DOMAIN-SUFFIX": "HOST-SUFFIX",
                "DOMAIN-KEYWORD": "HOST-KEYWORD", "IP-CIDR6": "IP6-CIDR"}.get(kind, kind)
    if rule.kind == "AND":
        return "AND,(" + ",".join("(" + format_rule(child, client) + ")" for child in rule.children) + ")"
    return ",".join((kind, rule.value, *rule.flags))


def compact(rules):
    """Only remove conditions entirely covered by an existing same-policy condition."""
    suffixes = {r.value for r in rules if r.kind == "DOMAIN-SUFFIX"}
    networks = [(r, ipaddress.ip_network(r.value)) for r in rules if r.kind in {"IP-CIDR", "IP-CIDR6"}]
    kept, certificates = [], []
    for rule in rules:
        covering = None
        if rule.kind in {"DOMAIN", "DOMAIN-SUFFIX"}:
            labels = rule.value.split(".")
            for offset in range(0 if rule.kind == "DOMAIN" else 1, len(labels)):
                parent = ".".join(labels[offset:])
                if parent in suffixes:
                    covering = Rule("DOMAIN-SUFFIX", parent)
                    break
        elif rule.kind in {"IP-CIDR", "IP-CIDR6"}:
            network = ipaddress.ip_network(rule.value)
            for parent_rule, parent in networks:
                if (parent.version == network.version and parent != network and
                        parent_rule.flags == rule.flags and network.subnet_of(parent)):
                    covering = parent_rule
                    break
        if covering:
            certificates.append({"removed": format_rule(rule, "Loon"),
                                 "covered_by": format_rule(covering, "Loon")})
        else:
            kept.append(rule)
    return kept, certificates


def optimize(group, rules, client, policy):
    drop = {(item["kind"], item["value"]) for item in policy["remove_matchers"] if item["group"] == group}
    keywords = set(policy["remove_domain_keywords"].get(group, []))
    netflix = {item["cidr"] for item in policy["netflix"]["verified_existing_networks"]}
    output, retired, flags_changed = [], [], []
    for rule in rules:
        reason = None
        if rule.kind == "DOMAIN-KEYWORD" and rule.value in keywords:
            reason = "unbounded-domain-keyword"
        elif (rule.kind, rule.value) in drop:
            reason = ("unverified-or-shared-service-network" if rule.kind in IP_TYPES else
                      "reviewed-shared-or-misclassified-namespace")
        elif group == "Netflix" and rule.kind in {"IP-CIDR", "IP-CIDR6"} and rule.value not in netflix:
            reason = "not-verified-as-a-Netflix-registered-network"
        elif group == "ParsecP2P" and (rule.kind == "SRC-PORT" or
                rule.kind == "AND" and any(c.kind == "SRC-PORT" for c in rule.children)):
            reason = "source-port-only-fallback-moved-to-explicit-opt-in"
        if reason:
            retired.append({"rule": format_rule(rule, "Loon"), "reason": reason})
            continue
        if rule.kind in IP_TYPES:
            # QX does not document this option. For Shadowrocket, do not invent
            # the ASN+option combination absent from the existing native files.
            flags = () if client == "QuantumultX" or client == "Shadowrocket" and rule.kind == "IP-ASN" else ("no-resolve",)
            if rule.flags != flags:
                flags_changed.append(format_rule(rule, "Loon"))
            rule = replace(rule, flags=flags)
        output.append(rule)
    if group == "ParsecP2P" and client == "Loon":
        process_rule = Rule("AND", children=(Rule("PROCESS-NAME", "parsecd"), Rule("PROTOCOL", "UDP")))
        if process_rule not in output:
            output.append(process_rule)
    for item in policy["add_matchers"]:
        if item["group"] == group:
            flags = ()
            if item["kind"] in IP_TYPES and client != "QuantumultX" and not (
                    client == "Shadowrocket" and item["kind"] == "IP-ASN"):
                flags = ("no-resolve",)
            rule = Rule(item["kind"], item["value"], flags)
            if rule not in output:
                output.append(rule)
    output, certificates = compact(output)
    if not output:
        raise ValueError("refusing to empty " + client + "/" + group)
    return output, {"retired": retired, "equivalence_certificates": certificates,
                    "resolution_flags_changed": flags_changed}


def render(original, rules, client):
    lines = original.splitlines()
    end = next(i for i, line in enumerate(lines) if line and not line.startswith("#"))
    header = lines[:end]
    header = [re.sub(r"^# RULES: \d+$", "# RULES: " + str(len(rules)), line) for line in header]
    marker = "# OFFICIAL-REVIEW: 2026-11-13; Docs/Official-Optimization-2026-11-13.md"
    if marker not in header:
        while header and not header[-1]:
            header.pop()
        header.extend([marker, ""])
    if client == "Egern":
        fields = defaultdict(list)
        inverse = {kind: key for key, kind in EG_KEYS.items()}
        for rule in rules:
            if rule.kind not in inverse:
                raise ValueError("cannot serialize undocumented Egern match type")
            fields[inverse[rule.kind]].append(rule.value)
        body = ["no_resolve: true", ""] if any(rule.kind in IP_TYPES for rule in rules) else []
        for field in EG_KEYS:
            if fields[field]:
                body.append(field + ":")
                body.extend("  - " + json.dumps(value, ensure_ascii=False) for value in fields[field])
                body.append("")
        return "\n".join(header + body).rstrip() + "\n"
    values = [format_rule(rule, client) for rule in rules]
    if client == "Clash":
        quote = "'" if any(line.startswith("  - '") for line in lines) else '"'
        encode = (lambda value: "'" + value.replace("'", "''") + "'") if quote == "'" else (lambda value: json.dumps(value, ensure_ascii=False))
        body = ["payload:"] + ["  - " + encode(value) for value in values]
    else:
        body = values
    return "\n".join(header + body) + "\n"


def plan(root=ROOT, policy_path=POLICY):
    policy = json.loads(policy_path.read_text())
    edits, report = {}, {"checked_at": policy["checked_at"], "groups": {}, "client_changes": {}}
    for client, extension in CLIENTS.items():
        for group in GROUPS:
            path = root / client / "rule" / (group + extension)
            before = path.read_bytes()
            rules = read_rules(path, client)
            optimized, details = optimize(group, rules, client, policy)
            # Keep every untouched file byte-for-byte; do not reformat the whole repository.
            if optimized == rules:
                continue
            after = render(before.decode(), optimized, client).encode()
            relative = path.relative_to(root).as_posix()
            edits[path] = (before, after)
            report["client_changes"][relative] = {"before": len(rules), "after": len(optimized),
                "before_sha256": hashlib.sha256(before).hexdigest(), "after_sha256": hashlib.sha256(after).hexdigest()}
            if client == "Loon":
                report["groups"][group] = details
    return edits, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true")
    mode.add_argument("--check", action="store_true")
    parser.add_argument("--json", type=Path)
    args = parser.parse_args()
    edits, report = plan()
    if args.apply:
        # Validate the complete plan before the first write, including concurrent edits.
        for path, (before, after) in edits.items():
            if path.read_bytes() != before:
                raise RuntimeError("concurrent modification: " + path.relative_to(ROOT).as_posix())
        for path, (before, after) in edits.items():
            if path.read_bytes() != before:
                raise RuntimeError("concurrent modification: " + path.relative_to(ROOT).as_posix())
            path.write_bytes(after)
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(str(len(edits)) + " native files " + ("updated" if args.apply else "would change"))
    return bool(edits) if args.check else 0


if __name__ == "__main__":
    raise SystemExit(main())
