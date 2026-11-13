#!/usr/bin/env python3
"""Check tracked install entries and the exact Git objects of pinned runtimes offline."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import unquote, urlsplit

from validate_rules import CLIENTS, ROOT, UniqueLoader
import yaml


def git(*args):
    return subprocess.check_output(["git", "-C", str(ROOT), *args], stderr=subprocess.PIPE)


def check(node=None):
    tracked = git("ls-files", "-z").decode().split("\0")
    entries = sorted(path for path in tracked
                     if re.fullmatch(r"(?:" + "|".join(CLIENTS) + r")/script/[^/]+\.(?:lpx|plugin|sgmodule|conf|yaml|json|js)", path))
    refs = {}
    problems = []
    for entry in entries:
        text = (ROOT / entry).read_text()
        try:
            if entry.endswith(".yaml"):
                data = yaml.load(text, Loader=UniqueLoader)
                if not isinstance(data, dict):
                    raise ValueError("expected a YAML mapping")
            elif entry.endswith(".json"):
                json.loads(text)
        except (ValueError, yaml.YAMLError) as error:
            problems.append(entry + ": " + str(error))
        urls = re.findall(r"https://raw\.githubusercontent\.com/hhhoratioxu/Proxy/[^\s\"'<>),]+", text)
        for url in urls:
            parts = urlsplit(url)
            components = unquote(parts.path).split("/", 4)
            if len(components) != 5 or not components[4].endswith(".js"):
                continue
            revision, path = components[3:]
            if not re.fullmatch(r"[0-9a-f]{40}", revision):
                problems.append(entry + ": runtime URL is not pinned to a full commit")
                continue
            key = revision + ":" + path
            if key not in refs:
                try:
                    content = git("show", key)
                    refs[key] = {"bytes": len(content), "sha256": hashlib.sha256(content).hexdigest(),
                                 "entries": [], "syntax_checked": False}
                    if node:
                        # Only parse the exact runtime bytes. Do not execute runtime code
                        # or invoke real service requests while checking references.
                        with tempfile.TemporaryDirectory(prefix="proxy-runtime-check-") as directory:
                            file = Path(directory) / "runtime.js"
                            file.write_bytes(content)
                            result = subprocess.run([node, "--check", str(file)], capture_output=True, text=True)
                            if result.returncode:
                                # Runtime errors may contain source excerpts: omit them.
                                problems.append(path + ": JavaScript syntax check failed")
                            else:
                                refs[key]["syntax_checked"] = True
                except subprocess.CalledProcessError:
                    problems.append(entry + ": missing pinned Git runtime object: " + key)
                    continue
            refs[key]["entries"].append(entry)
    for stem in ["YouTubeClean", "MeituanWaimai"]:
        plugin = ROOT / "Loon/script" / (stem + ".plugin")
        canonical = ROOT / "Loon/script" / (stem + ".lpx")
        if plugin.read_bytes() != canonical.read_bytes():
            problems.append("Loon " + stem + ": compatibility alias differs from canonical .lpx")
    return {"entries": entries, "runtime_objects": refs, "problems": problems}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--node", help="optional Node executable for syntax checks")
    parser.add_argument("--json", type=Path)
    args = parser.parse_args()
    report = check(args.node)
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(report['entries'])} tracked install entries / {len(report['runtime_objects'])} pinned runtimes / "
          f"{len(report['problems'])} problems")
    for problem in report["problems"]:
        print("FAIL: " + problem)
    return bool(report["problems"])


if __name__ == "__main__":
    raise SystemExit(main())
