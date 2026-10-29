# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-10-29

### Features
- **invariants**: implement pre-flight checks, secret scanning (Gitleaks) and Git overlap detector (#5)
- **seats**: scaffold the three-seat review tribunal engine (Seat A: Logic, Seat B: Tests, Seat C: KISS) with prompt injection defenses and multi-provider adapter (#6)
- **tally**: deterministic asymmetric quorum tally and GitHub PR comments publisher with inline diff annotations (#7)
- **budget**: tamper-evident correction loop counter and auto-merge gate with human escalation notifier (#8)
- **cli**: persist local artifacts (`.tribunal/review.md` & `verdict.json`) and provide standalone review runner (#10)
- **ci**: add GitHub Actions CI pipeline, Gitleaks secret scanner, and Release Please automation
