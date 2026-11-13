#!/usr/bin/env python3
"""Offline checks for the six existing native rule formats. Never edits rules."""

import argparse
from collections import Counter
from dataclasses import dataclass
import fnmatch
import ipaddress
import json
from pathlib import Path
import re
import sys
from dataclasses import replace

import yaml

ROOT = Path(__file__).resolve().parents[1]
CLIENTS = {"Loon": ".lsr", "Surge": ".list", "Egern": ".yaml",
           "QuantumultX": ".list", "Shadowrocket": ".list", "Clash": ".yaml"}
GROUPS = tuple("AI Adobe Apple Bilibili Disney GitHub Google HBOMAX Infuse LAN "
               "Meituan Meta Microsoft NTP Netflix Parsec ParsecP2P SiriAI Spotify "
               "Telegram TikTok Twitter WeChat Weverse Wikimedia Xiaohongshu".split())
EG_KEYS = {"domain_set": "DOMAIN", "domain_suffix_set": "DOMAIN-SUFFIX",
           "domain_keyword_set": "DOMAIN-KEYWORD", "user_agent_set": "USER-AGENT",
           "ip_cidr_set": "IP-CIDR", "ip_cidr6_set": "IP-CIDR6", "asn_set": "IP-ASN"}
QX_TYPES = {"HOST": "DOMAIN", "HOST-SUFFIX": "DOMAIN-SUFFIX",
            "HOST-KEYWORD": "DOMAIN-KEYWORD", "IP6-CIDR": "IP-CIDR6"}
IP_TYPES = {"IP-CIDR", "IP-CIDR6", "IP-ASN"}
BASE_TYPES = {"DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "USER-AGENT"} | IP_TYPES


class UniqueLoader(yaml.SafeLoader):
    """Reject duplicate mapping keys instead of silently taking the last value."""


def unique_mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ValueError("duplicate YAML key: " + str(key))
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)


@dataclass(frozen=True)
class Rule:
    kind: str
    value: str = ""
    flags: tuple = ()
    children: tuple = ()

    def matcher(self):
        # Egern's no_resolve applies to the entire set, so compare match objects
        # separately from resolution behavior. The audit reports that difference.
        return (self.kind, self.value, tuple(c.matcher() for c in self.children))


def split_top(text):
    depth = 0
    start = 0
    parts = []
    for index, char in enumerate(text):
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
            if depth < 0:
                raise ValueError("unbalanced rule parentheses")
        elif char == "," and depth == 0:
            parts.append(text[start:index].strip())
            start = index + 1
    if depth:
        raise ValueError("unbalanced rule parentheses")
    return parts + [text[start:].strip()]


def parse_rule(text, client):
    parts = split_top(text)
    kind = parts[0]
    native = BASE_TYPES | {"AND", "SRC-PORT", "PROCESS-NAME", "PROTOCOL"}
    if client == "QuantumultX":
        native = (BASE_TYPES - {"DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "IP-CIDR6"}) | set(QX_TYPES)
    elif client == "Clash":
        native = (native - {"USER-AGENT", "PROTOCOL"}) | {"NETWORK"}
    elif client == "Shadowrocket":
        native = BASE_TYPES
    if kind not in native:
        raise ValueError("unsupported native rule type: " + kind)
    kind = QX_TYPES.get(kind, kind)
    if kind == "AND":
        if len(parts) != 2 or not parts[1].startswith("(") or not parts[1].endswith(")"):
            raise ValueError("invalid policy-less AND rule")
        children = []
        for item in split_top(parts[1][1:-1]):
            if not item.startswith("(") or not item.endswith(")"):
                raise ValueError("AND child must be parenthesized")
            children.append(parse_rule(item[1:-1], client))
        if len(children) < 2:
            raise ValueError("AND needs two or more conditions")
        return Rule(kind, children=tuple(children))
    if len(parts) not in (2, 3) or not parts[1]:
        raise ValueError("invalid policy-less rule")
    flags = tuple(parts[2:])
    if flags and (client == "QuantumultX" or flags != ("no-resolve",) or kind not in IP_TYPES):
        raise ValueError("unexpected option or embedded policy")
    value = parts[1]
    if kind in {"IP-CIDR", "IP-CIDR6"}:
        network = ipaddress.ip_network(value, strict=True)
        if network.version != (6 if kind == "IP-CIDR6" else 4):
            raise ValueError("IP family does not match rule type")
        value = str(network)
    elif kind == "IP-ASN":
        if not value.isdecimal() or not 0 < int(value) < 2**32:
            raise ValueError("invalid numeric ASN")
    elif kind in {"DOMAIN", "DOMAIN-SUFFIX"}:
        if not re.fullmatch(r"[a-z0-9_-]+(?:\.[a-z0-9_-]+)*", value):
            raise ValueError("invalid literal domain")
    elif kind == "SRC-PORT":
        if not value.isdecimal() or not 0 < int(value) < 65536:
            raise ValueError("invalid source port")
    elif kind in {"NETWORK", "PROTOCOL"}:
        if value.lower() not in {"tcp", "udp"}:
            raise ValueError("unexpected network/protocol")
    return Rule(kind, value, flags)


def read_rules(path, client):
    text = path.read_bytes().decode("utf-8")
    if "\r" in text or not text.endswith("\n"):
        raise ValueError("expected LF and final newline")
    if any(line.rstrip() != line for line in text.splitlines() if not line.startswith("#")):
        raise ValueError("trailing whitespace in rule data")
    if client in {"Clash", "Egern"}:
        data = yaml.load(text, Loader=UniqueLoader)
        if not isinstance(data, dict):
            raise ValueError("rule set must be a YAML mapping")
        if client == "Clash":
            if set(data) != {"payload"} or not isinstance(data["payload"], list):
                raise ValueError("classical provider requires a payload sequence")
            rules = [parse_rule(item, client) for item in data["payload"]]
        else:
            if set(data) - set(EG_KEYS) - {"no_resolve"}:
                raise ValueError("unknown Egern rule-set field")
            if "no_resolve" in data and not isinstance(data["no_resolve"], bool):
                raise ValueError("no_resolve must be boolean")
            rules = []
            for key, values in data.items():
                if key == "no_resolve":
                    continue
                if not isinstance(values, list) or not values:
                    raise ValueError("Egern match set must be a nonempty sequence")
                for value in values:
                    if not isinstance(value, str):
                        raise ValueError("Egern match values must be quoted strings")
                    kind = EG_KEYS[key]
                    flag = ",no-resolve" if kind in IP_TYPES and data.get("no_resolve", False) else ""
                    rules.append(parse_rule(kind + "," + value + flag, "Loon"))
    else:
        rules = [parse_rule(line, client) for line in text.splitlines()
                 if line and not line.startswith(("#", ";", "//"))]
    if not rules:
        raise ValueError("empty rule set")
    counts = re.findall(r"^# RULES: (\d+)$", text, re.M)
    if len(counts) != 1 or int(counts[0]) != len(rules):
        raise ValueError("RULES header does not match actual count " + str(len(rules)))
    return rules


def matches(rule, sample):
    """Small offline fixture model; no DNS, ASN lookup, sniffing or client emulation."""
    host = sample.get("host", "").lower().rstrip(".")
    kind, value = rule.kind, rule.value
    if kind == "DOMAIN":
        return host == value
    if kind == "DOMAIN-SUFFIX":
        return host == value or host.endswith("." + value)
    if kind == "DOMAIN-KEYWORD":
        return value in host
    if kind == "USER-AGENT":
        return fnmatch.fnmatchcase(sample.get("user_agent", ""), value)
    if kind in {"IP-CIDR", "IP-CIDR6"}:
        address = sample.get("ip")
        return bool(address and ipaddress.ip_address(address) in ipaddress.ip_network(value))
    if kind == "IP-ASN":
        return str(sample.get("asn", "")) == value
    if kind == "SRC-PORT":
        return str(sample.get("source_port", "")) == value
    if kind == "PROCESS-NAME":
        if sample.get("client") in {"Loon", "Surge"} and sample.get("platform") != "macos":
            return False
        if sample.get("client") == "Loon" and not value.startswith("/"):
            return sample.get("process", "").lower() == value.lower()
        return sample.get("process") == value
    if kind in {"NETWORK", "PROTOCOL"}:
        return sample.get("network", "").lower() == value.lower()
    if kind == "AND":
        return all(matches(child, sample) for child in rule.children)
    raise ValueError("fixture model cannot evaluate " + kind)


def audit(root=ROOT):
    problems = []
    inventory = {}
    parsed = {}
    optional_inventory = {}
    resolution_differences = {}
    for client, extension in CLIENTS.items():
        files = sorted(p for p in (root / client / "rule").glob("*") if p.is_file())
        expected = {name + extension for name in GROUPS}
        if {p.name for p in files} != expected:
            problems.append(client + ": expected exactly the existing 26 categories")
        for group in GROUPS:
            path = root / client / "rule" / (group + extension)
            label = path.relative_to(root).as_posix()
            try:
                rules = read_rules(path, client)
            except (ValueError, TypeError, OSError, yaml.YAMLError) as error:
                problems.append(label + ": " + str(error))
                continue
            parsed[client, group] = rules
            inventory[label] = {"rules": len(rules), "types": dict(sorted(Counter(r.kind for r in rules).items()))}
            if len({r.matcher() for r in rules}) != len(rules):
                problems.append(label + ": duplicate match objects (including no-resolve variants)")
            numeric = sum(r.kind == "DOMAIN-KEYWORD" and bool(re.fullmatch(r"(?:\d{1,3}\.){3}", r.value)) for r in rules)
            if numeric:
                problems.append(label + ": numeric IP fragments used as domain keywords: " + str(numeric))
            if any(r.kind == "DOMAIN-KEYWORD" for r in rules):
                problems.append(label + ": unreviewed unbounded domain keyword")
        optional = root / client / "rule/optional"
        if client in {"Loon", "Surge", "Clash"} and not optional.exists():
            problems.append(client + ": missing explicit opt-in Parsec port fallback")
        if optional.exists():
            expected_optional = {"ParsecP2P-Port9000" + extension} if client in {"Loon", "Surge", "Clash"} else set()
            if {p.name for p in optional.iterdir()} != expected_optional:
                problems.append(client + ": unexpected optional rule files")
            for path in sorted(optional.glob("*")):
                label = path.relative_to(root).as_posix()
                try:
                    rules = read_rules(path, client)
                    parsed[client, path.stem] = rules
                    optional_inventory[label] = {"rules": len(rules)}
                    if len(rules) != 1 or rules[0].kind != "AND":
                        problems.append(label + ": optional source-port fallback must be one explicit conjunction")
                except (ValueError, TypeError, OSError, yaml.YAMLError) as error:
                    problems.append(label + ": " + str(error))
    for client in CLIENTS:
        for group in GROUPS:
            if group == "ParsecP2P" or (client, group) not in parsed or ("Loon", group) not in parsed:
                continue
            source = parsed["Loon", group]
            expected = {r.matcher() for r in source if client != "Clash" or r.kind != "USER-AGENT"}
            if {r.matcher() for r in parsed[client, group]} != expected:
                problems.append(client + "/" + group + ": match objects differ from Loon (after documented capability omissions)")
            # Order is retained in line/classical formats; Egern fields are OR sets.
            if client not in {"Egern", "Loon"}:
                expected_rules = [r for r in source if client != "Clash" or r.kind != "USER-AGENT"]
                if client == "QuantumultX":
                    expected_rules = [replace(r, flags=()) for r in expected_rules]
                elif client == "Shadowrocket":
                    expected_rules = [replace(r, flags=()) if r.kind == "IP-ASN" else r for r in expected_rules]
                if parsed[client, group] != expected_rules:
                    problems.append(client + "/" + group + ": rule order or per-rule flags differ")
            if client == "Egern":
                source_ip = [r for r in source if r.kind in IP_TYPES]
                target_ip = [r for r in parsed[client, group] if r.kind in IP_TYPES]
                expected_no_resolve = any(r.flags for r in source_ip)
                if any(bool(r.flags) != expected_no_resolve for r in target_ip):
                    problems.append("Egern/" + group + ": unexpected set-wide no_resolve behavior")
                changed = sum(bool(r.flags) != expected_no_resolve for r in source_ip)
                if changed:
                    resolution_differences[group] = {"no_resolve": expected_no_resolve,
                                                      "conditions_with_different_resolution_behavior": changed}
    fixture_path = root / "tests/routing-cases.json"
    cases = json.loads(fixture_path.read_text()) if fixture_path.exists() else []
    assertions = 0
    for case in cases:
        for client in case.get("clients", CLIENTS):
            key = client, case["group"]
            if key not in parsed:
                continue
            sample = dict(case["sample"], client=client)
            actual = any(matches(rule, sample) for rule in parsed[key])
            assertions += 1
            if actual != case["match"]:
                problems.append(client + ": fixture failed: " + case["name"])
    suffixes = {}
    for (client, group), rules in parsed.items():
        if client == "Loon":
            for rule in rules:
                if rule.kind == "DOMAIN-SUFFIX":
                    suffixes.setdefault(rule.value, set()).add(group)
    overlap = Counter()
    redundant = Counter()
    remaining_keywords = {}
    for group in GROUPS:
        rules = parsed.get(("Loon", group), [])
        keywords = [r.value for r in rules if r.kind == "DOMAIN-KEYWORD"]
        if keywords:
            remaining_keywords[group] = keywords
        for rule in rules:
            if rule.kind not in {"DOMAIN", "DOMAIN-SUFFIX"}:
                continue
            labels = rule.value.split(".")
            covered_here = False
            for i in range(len(labels)):
                parent = ".".join(labels[i:])
                for owner in suffixes.get(parent, ()):
                    if owner != group:
                        overlap[group + " -> " + owner] += 1
                    elif rule.kind == "DOMAIN" or i > 0:
                        covered_here = True
            if covered_here:
                redundant[group] += 1
    return {"schema": 1, "files": len(inventory), "groups": len(GROUPS),
            "conditions": sum(v["rules"] for v in inventory.values()),
            "fixture_assertions": assertions, "problems": problems, "inventory": inventory,
            "optional_inventory": optional_inventory,
            "egern_resolution_differences": resolution_differences,
            "remaining_keywords": remaining_keywords,
            "domain_conditions_covered_by_same_group_suffix": dict(sorted(redundant.items())),
            "domain_overlap_counts": dict(sorted(overlap.items()))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--json", type=Path, help="optional report path; never writes rule files")
    args = parser.parse_args()
    report = audit(args.root.resolve())
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(f"{report['files']} files / {report['groups']} groups / {report['conditions']} conditions / "
          f"{report['fixture_assertions']} fixture assertions / {len(report['problems'])} problems")
    for problem in report["problems"][:30]:
        print("FAIL: " + problem)
    return bool(report["problems"])


if __name__ == "__main__":
    sys.exit(main())
