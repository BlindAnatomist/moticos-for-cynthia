#!/usr/bin/env python3
"""Bounded batch wrapper around the proven, lossless evidence packer."""
import argparse
import json
from pathlib import Path
import sys
import preserveEvidence as evidence

MIB = 1024 * 1024
# Approved redistribution: 32 MiB preflight + three 98 MiB profiles = 326 MiB.
# Bounds include repeated manifests and a conservative ZIP framing allowance.
BOUNDS = {"preflight": (32 * MIB, 1), "browser": (49 * MIB, 2)}
evidence.SAFE_DIRECTORIES = ("preflight-results", "batch-test-results", "rollback-test-results", "test-results")

def validate_budget(manifest, manifest_bytes, kind):
    limit, max_parts = BOUNDS[kind]
    assert 1 <= len(manifest["parts"]) <= max_parts
    total = 0
    for part in manifest["parts"]:
        upper_bound = part["bytes"] + manifest_bytes + 4096
        assert upper_bound <= limit, "Part plus manifest/ZIP overhead exceeds budget"
        total += upper_bound
    assert total <= limit * max_parts, "Profile evidence exceeds budget"
    return total

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=BOUNDS)
    parser.add_argument("--github-output")
    args = parser.parse_args(argv)
    limit, max_parts = BOUNDS[args.kind]
    root = Path("bounded-evidence")
    root.mkdir(exist_ok=True)
    cli = ["pack", "--archive", str(root / f"{args.kind}-evidence.tar.gz"),
           "--out", str(root / "parts"), "--root", ".",
           "--chunk-bytes", str(limit - 65536), "--max-parts", str(max_parts)]
    includes = ["preflight-results"] if args.kind == "preflight" else list(evidence.SAFE_DIRECTORIES)
    for name in includes:
        cli += ["--include", name]
    if args.github_output:
        cli += ["--github-output", args.github_output]
    try:
        manifest = evidence.preserve(evidence.parser().parse_args(cli))
        total = validate_budget(manifest, (root / "parts/manifest.json").stat().st_size, args.kind)
    except (AssertionError, OSError, evidence.EvidenceError) as error:
        print(f"Complete evidence gate failed: {error}", file=sys.stderr)
        return 1
    print(f"Preserved every raw byte: {total} upload bytes upper bound; {len(manifest['parts'])} parts.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
