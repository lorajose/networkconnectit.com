#!/usr/bin/env python3
"""Audit public HTML for claims that require evidence or safer wording before release."""
from pathlib import Path
import re
import sys

RULES = {
    "unsupported proof counters": re.compile(r"Created Projects|Happy Clients", re.I),
    "absolute/high-risk operational promises": re.compile(
        r"zero[- ]downtime|guaranteed response time|NOC-grade support|cloud backup of CCTV recordings",
        re.I,
    ),
    "legacy off-topic marketing copy": re.compile(
        r"Why did you choose Our Email Services|email marketing|our email services", re.I
    ),
    "self-serving aggregate rating markup": re.compile(r'"aggregateRating"', re.I),
    "credential language requiring evidence review": re.compile(
        r"Cisco[- /&]*certified|UniFi[- /&]*certified|certified engineers?|CCNA and CCNP Expertise",
        re.I,
    ),
    "unqualified monitoring/SLA language": re.compile(r"24/7 monitoring|24/7 support|SLA[- ]backed|SLA response", re.I),
    "placeholder portfolio content": re.compile(r"representative .*placeholder|realistic placeholder", re.I),
}

PUBLIC_HTML = sorted(Path(".").glob("*.html")) + sorted(Path("tools").glob("**/*.html"))
findings = []
for path in PUBLIC_HTML:
    text = path.read_text(encoding="utf-8", errors="replace")
    for line_no, line in enumerate(text.splitlines(), 1):
        for category, pattern in RULES.items():
            if pattern.search(line):
                findings.append((str(path), line_no, category, line.strip()))

if findings:
    print("Public content trust audit findings:\n")
    for path, line_no, category, line in findings:
        print(f"{path}:{line_no}: [{category}] {line[:220]}")
    print(f"\n{len(findings)} finding(s) require evidence review or remediation before release.")
    sys.exit(1)

print("Public content trust audit passed: no configured high-risk claims found.")
