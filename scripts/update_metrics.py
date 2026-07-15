#!/usr/bin/env python3
"""Update the public metrics snapshot from owner-verified source exports.

This intentionally does not scrape Google Scholar or authenticated SSRN pages.
It validates a reviewed snapshot, computes the SSRN percentile, and updates the
single facts file used by the website.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FACTS_PATH = ROOT / "data" / "site-facts.json"


def positive(value: str) -> int:
    number = int(value)
    if number < 0:
        raise argparse.ArgumentTypeError("must be zero or greater")
    return number


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reviewed", required=True, help="Evidence review date (YYYY-MM-DD)")
    parser.add_argument("--citations", required=True, type=positive)
    parser.add_argument("--h-index", required=True, type=positive)
    parser.add_argument("--i10-index", required=True, type=positive)
    parser.add_argument("--ssrn-papers", required=True, type=positive)
    parser.add_argument("--ssrn-views", required=True, type=positive)
    parser.add_argument("--ssrn-downloads", required=True, type=positive)
    parser.add_argument("--ssrn-rank", required=True, type=positive)
    parser.add_argument("--ssrn-population", required=True, type=positive)
    parser.add_argument("--wos-review-records", required=True, type=positive)
    parser.add_argument("--wos-manuscripts", required=True, type=positive)
    parser.add_argument("--check", action="store_true", help="Validate and print without writing")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    reviewed = date.fromisoformat(args.reviewed)
    if reviewed > date.today():
        raise ValueError("review date cannot be in the future")
    if not 1 <= args.ssrn_rank <= args.ssrn_population:
        raise ValueError("SSRN rank must be between 1 and the author population")
    if args.ssrn_downloads > args.ssrn_views:
        raise ValueError("SSRN downloads cannot exceed views")
    if args.wos_manuscripts > args.wos_review_records:
        raise ValueError("Web of Science manuscripts cannot exceed review records")

    facts = json.loads(FACTS_PATH.read_text(encoding="utf-8"))
    metrics = facts["metrics"]
    metrics.update(
        {
            "googleScholarCitations": args.citations,
            "hIndex": args.h_index,
            "i10Index": args.i10_index,
            "ssrnPublicPapers": args.ssrn_papers,
            "ssrnViews": args.ssrn_views,
            "ssrnDownloads": args.ssrn_downloads,
            "ssrnAuthorRank": args.ssrn_rank,
            "ssrnAuthorPopulation": args.ssrn_population,
            "ssrnTopPercent": f"{args.ssrn_rank / args.ssrn_population * 100:.1f}%",
            "wosPeerReviewRecords": args.wos_review_records,
            "wosManuscriptsReviewed": args.wos_manuscripts,
        }
    )
    facts["reviewed"] = reviewed.isoformat()
    for source in ("googleScholar", "ssrn", "researchId", "webOfScience"):
        facts["evidence"][source]["asOf"] = reviewed.isoformat()

    rendered = json.dumps(facts, indent=2, ensure_ascii=False) + "\n"
    if args.check:
        print(rendered, end="")
        return 0

    FACTS_PATH.write_text(rendered, encoding="utf-8")
    print(f"Updated {FACTS_PATH.relative_to(ROOT)} for {reviewed.isoformat()}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        print(f"Metric update refused: {exc}", file=sys.stderr)
        sys.exit(2)
