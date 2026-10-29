# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/compare/v1.0.0...v1.1.0) (2026-10-29)


### Features

* **budget:** tamper-evident correction loop counter and auto-merge gate ([bbd625d](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/commit/bbd625d6cb14a2557e822fc9ff297ebc546e9522))
* **budget:** tamper-evident correction loop counter and auto-merge gate ([5243cd1](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/commit/5243cd189826ddd3aa9c82f6659d2127fe863584))
* **cli:** persist local artifacts (.tribunal/) and provide standalone review runner ([#10](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/issues/10)) ([376fe26](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/commit/376fe2629853a48e87e384dcacefe78394669502))
* **init:** bootstrap repository with PR-008 Synthetic Review Tribunal specification ([fa24789](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/commit/fa247895ccbc4933be92d9c50317f3129e2bab69))
* **invariants:** implement pre-flight checks and Git overlap detector ([0db281f](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/commit/0db281f93a9f21bdcac26b79007c9c00e57c60b7))
* **invariants:** implement pre-flight checks and Git overlap detector ([754736a](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/commit/754736a758373abfe728d52f41a2da7876c08588))
* **seats:** scaffold the three-seat review tribunal engine ([12857ff](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/commit/12857ffe5e83340eeda8074329d81c55ca157a20))
* **seats:** scaffold the three-seat review tribunal engine ([558ed99](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/commit/558ed99890255f12b72c0c7e0c82f3c86dde13c3))
* **tally:** deterministic asymmetric quorum tally and GitHub PR comments publisher ([22da644](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/commit/22da6449978a5e718160108fd8ad479b953f572e))
* **tally:** deterministic asymmetric quorum tally and GitHub PR comments publisher ([4a90f2f](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/commit/4a90f2f28b829ca4d424c4f485f17cec28bb7530))


### Bug Fixes

* update default Anthropic model ID to claude-sonnet-4-6 ([#9](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/issues/9)) ([0f9131d](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/commit/0f9131d2d94a5d837207a2ea66e83e05912fba93))


### Continuous Integration

* add CI pipeline, Gitleaks scanner, and Release Please automation ([#11](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/issues/11)) ([87ce984](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/commit/87ce984ba25b51eab8caec13fba033a5dc42d4ec))

## [1.0.0] - 2026-10-29

### Features
- **invariants**: implement pre-flight checks, secret scanning (Gitleaks) and Git overlap detector (#5)
- **seats**: scaffold the three-seat review tribunal engine (Seat A: Logic, Seat B: Tests, Seat C: KISS) with prompt injection defenses and multi-provider adapter (#6)
- **tally**: deterministic asymmetric quorum tally and GitHub PR comments publisher with inline diff annotations (#7)
- **budget**: tamper-evident correction loop counter and auto-merge gate with human escalation notifier (#8)
- **cli**: persist local artifacts (`.tribunal/review.md` & `verdict.json`) and provide standalone review runner (#10)
- **ci**: add GitHub Actions CI pipeline, Gitleaks secret scanner, and Release Please automation
