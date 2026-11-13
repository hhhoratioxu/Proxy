#!/usr/bin/env python3
"""Check current public documentation paths, including case, without network requests."""

from pathlib import Path, PurePosixPath
import posixpath
import re
import subprocess
from urllib.parse import unquote, urlsplit

from validate_rules import ROOT


def check():
    tracked = set(subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0")) - {""}
    problems = []
    count = 0
    for name in sorted(tracked):
        if not name.endswith(".md"):
            continue
        text = (ROOT / name).read_text()
        for target in re.findall(r"\]\(([^\s)]+)\)", text):
            parsed = urlsplit(target)
            path = unquote(parsed.path)
            if not path:
                continue
            if parsed.scheme:
                if parsed.netloc == "raw.githubusercontent.com" and path.startswith("/hhhoratioxu/Proxy/main/"):
                    path = path[len("/hhhoratioxu/Proxy/main/"):]
                elif parsed.netloc == "github.com" and re.match(r"^/hhhoratioxu/Proxy/(?:blob|tree)/main/", path):
                    path = re.sub(r"^/hhhoratioxu/Proxy/(?:blob|tree)/main/", "", path)
                else:
                    continue
            else:
                path = posixpath.normpath(str(PurePosixPath(name).parent / path))
            path = path.rstrip("/")
            count += 1
            if path not in tracked and not any(p.startswith(path + "/") for p in tracked):
                problems.append(name + ": nonexistent or incorrectly cased public path: " + path)
    return count, sorted(set(problems))


if __name__ == "__main__":
    count, problems = check()
    print(f"{count} current repository documentation links / {len(problems)} problems")
    for problem in problems:
        print("FAIL: " + problem)
    raise SystemExit(bool(problems))
