"""Read installed app protobuf descriptor facts; never inspect user data.

Print field names/numbers/types only. No executable or descriptor blobs copied.
This developer tool is not included in a Loon runtime.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re


def uint(buf, at):
    value = 0
    for shift in range(0, 70, 7):
        item = buf[at]
        at += 1
        value |= (item & 127) << shift
        if item < 128:
            return value, at
    raise ValueError("varint")


def fields(buf, root=False):
    result, at = [], 0
    while at < len(buf):
        tag, at = uint(buf, at)
        if not tag:
            break
        number, wire = tag >> 3, tag & 7
        if root and not 1 <= number <= 14:
            break
        if wire == 2:
            size, at = uint(buf, at)
            value = buf[at:at + size]
            at += size
        elif wire == 0:
            value, at = uint(buf, at)
        elif wire in (1, 5):
            at += 8 if wire == 1 else 4
            value = None
        else:
            raise ValueError("wire")
        if at > len(buf):
            raise ValueError("length")
        result.append((number, wire, value))
    return result


def value(fs, number, wire):
    found = [v for n, w, v in fs if n == number and w == wire]
    return found[-1] if found else None


def text(fs, number):
    return (value(fs, number, 2) or b"").decode("utf-8", "replace")


def descriptors(binary):
    seen = set()
    names = rb"(?:[A-Za-z0-9_.-]+/)*[A-Za-z0-9_.-]+\.proto"
    for match in re.finditer(names, binary):
        for width in range(1, 4):
            at = match.start() - width - 1
            if at < 0 or binary[at] != 10:
                continue
            try:
                size, end = uint(binary, at + 1)
                if end != match.start() or size != match.end() - match.start() or at in seen:
                    continue
                seen.add(at)
                fs = fields(binary[at:at + 131072], True)
                if text(fs, 1).endswith(".proto") and text(fs, 2).startswith("spotify."):
                    yield fs
            except (ValueError, IndexError):
                pass
            break


def messages(payload, parent=""):
    fs = fields(payload)
    name = parent + text(fs, 1)
    rows = []
    for number, wire, data in fs:
        if number == 2 and wire == 2:
            row = fields(data)
            rows.append({"name": text(row, 1), "number": value(row, 3, 0),
                         "type": value(row, 5, 0), "typeName": text(row, 6)})
    yield name, rows
    for number, wire, data in fs:
        if number == 3 and wire == 2:
            yield from messages(data, name + ".")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, default=Path("/Applications/Spotify.app/Contents/MacOS/Spotify"))
    parser.add_argument("--package-pattern", default="extendedmetadata")
    parser.add_argument("--message-pattern", default="Request|Header|Cache|Query|Entity")
    options = parser.parse_args()
    data = options.binary.read_bytes()
    facts = []
    count = 0
    for descriptor in descriptors(data):
        count += 1
        package = text(descriptor, 2)
        if not re.search(options.package_pattern, package, re.I):
            continue
        for number, wire, payload in descriptor:
            if number != 4 or wire != 2:
                continue
            try:
                for name, rows in messages(payload):
                    if re.search(options.message_pattern, name, re.I):
                        facts.append({"file": text(descriptor, 1), "package": package,
                                      "message": name, "fields": rows})
            except (ValueError, IndexError):
                continue
    print(json.dumps({"source": str(options.binary), "sha256": hashlib.sha256(data).hexdigest(),
                      "descriptorCount": count, "facts": facts}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
