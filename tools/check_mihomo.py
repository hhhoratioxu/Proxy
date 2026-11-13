#!/usr/bin/env python3
"""Run an optional, isolated Mihomo -t check without starting a proxy or TUN."""

import argparse
import json
from pathlib import Path
import subprocess
import tempfile

import yaml
from validate_rules import ROOT, GROUPS, UniqueLoader, split_top


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("executable", help="path to an independently installed Mihomo executable")
    parser.add_argument("--json", type=Path)
    args = parser.parse_args()
    executable = str(Path(args.executable).expanduser().resolve())
    report = {"version": subprocess.check_output([executable, "-v"], text=True).strip(), "checks": []}
    with tempfile.TemporaryDirectory(prefix="proxy-mihomo-validation-") as directory:
        workspace = Path(directory)
        providers = {}
        inline = []
        (workspace / "rules").mkdir()
        for group in GROUPS:
            path = ROOT / "Clash/rule" / (group + ".yaml")
            rules = yaml.load(path.read_text(), Loader=UniqueLoader)["payload"]
            # The native core restricts file providers to its own configuration
            # directory. Preserve the repository bytes in that isolated directory.
            local = workspace / "rules" / path.name
            local.write_bytes(path.read_bytes())
            providers[group] = {"type": "file", "behavior": "classical", "format": "yaml", "path": str(local)}
            for rule in rules:
                parts = split_top(rule)
                inline.append(",".join(parts[:2] + ["DIRECT"] + parts[2:]))
        base = {"mode": "rule", "log-level": "error", "ipv6": True,
                "find-process-mode": "always", "dns": {"enable": False}, "tun": {"enable": False}}
        profiles = {
            "providers": dict(base, **{"rule-providers": providers,
                                       "rules": ["RULE-SET," + group + ",DIRECT" for group in GROUPS] + ["MATCH,DIRECT"]}),
            "inline": dict(base, rules=inline + ["MATCH,DIRECT"]),
        }
        optional_path = ROOT / "Clash/rule/optional/ParsecP2P-Port9000.yaml"
        optional_local = workspace / "rules" / optional_path.name
        optional_local.write_bytes(optional_path.read_bytes())
        profiles["optional-port-fallback"] = dict(base, **{
            "rule-providers": {"optional-port": {"type": "file", "behavior": "classical",
                                                   "format": "yaml", "path": str(optional_local)}},
            "rules": ["RULE-SET,optional-port,DIRECT", "MATCH,DIRECT"]})
        for name, profile in profiles.items():
            path = workspace / (name + ".yaml")
            path.write_text(yaml.safe_dump(profile, sort_keys=False))
            result = subprocess.run([executable, "-t", "-d", str(workspace), "-f", str(path)],
                                    capture_output=True, text=True, timeout=60)
            report["checks"].append({"name": name, "returncode": result.returncode,
                                      "output": (result.stdout + result.stderr).strip()})
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(report, indent=2) + "\n")
    print(report["version"])
    for check in report["checks"]:
        print(check["name"] + ": " + ("PASS" if not check["returncode"] else "FAIL"))
    return any(check["returncode"] for check in report["checks"])


if __name__ == "__main__":
    raise SystemExit(main())
