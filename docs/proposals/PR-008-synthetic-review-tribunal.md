# PR-008: Agentic Code Governance — The Synthetic Review Tribunal

**Status:** PROPOSED / ADOPTED AS FOUNDATION  
**Origin:** Adapted from MediaMarktSaturn Engineering Platform Team Proposal `PR-008` (`epft-docs#223`, EPDT-1251)  
**Target:** Generic, model-agnostic GitHub Action (`agentic-pr-review-gh-action`)  
**Author:** Saul Fernandez & Tachikoma Platform Core  
**Date:** 2026-10-28  

---

## 1. Abstract

When agentic workflows write pull requests at scale, human code review fails. The volume of machine-generated changes outpaces review bandwidth, and human reviewers suffer fatigue, leading to rubber-stamped PRs and missed regressions.

This proposal shifts the object of trust: **we do not review every diff manually; we review and trust the validation harness that governs code landing.**

The mechanism:
- A deterministic governance state machine.
- Three independent reviewer seats voting on each pull request.
- An asymmetric quorum rule: approvals require majority, but **blocking needs only one seat**.
- A tamper-evident, bounded correction budget (default: 3 iterations max).
- Machine-checkable invariants (tests, security scanners, linters, semantic overlap checks) as the non-negotiable hard gate.

---

## 2. Core Problem & Motivation

Traditional review was designed for human throughput (a few PRs per week). When autonomous coding fleets generate dozens of PRs per day across multiple repositories:

1. **The Review Bottleneck:** Pull requests pile up in queues.
2. **Hallucination Loops:** An agent failing a test can repeatedly re-prompt and produce hundreds of lines of churning diffs without making real progress.
3. **The Race Condition of Concurrent Merges:** Two pull requests can each pass CI against an older `main`, but break `main` when merged together because both modified interacting contracts without textual git conflicts (the semantic overlap hazard).
4. **Correlated Model Bias:** Relying on a single prompt or single model family amplifies biases rather than eliminating bugs.

---

## 3. The Design Principles

### Principle 1: Asymmetric Quorum, Not Simple Majority
- Three reviewer seats inspect the PR independently:
  - **Seat A — Correctness & Logic:** Edge cases, algorithmic correctness, contract regression, state integrity.
  - **Seat B — Test Quality & Boundaries:** Assertion strictness, mutation resistance, public interface testing rather than internal mocking.
  - **Seat C — Cognitive Load & Simplification:** Premature abstraction, dead code, unrequested features, adherence to repository idioms.
- **Quorum Rule:**
  - `APPROVE` requires a majority (2+ seats approving with 0 blockers).
  - `REQUEST_CHANGES` (blocking) **requires only ONE seat**. A single severe finding halts the merge.
  - Reviewer seats cannot self-approve: seats produce findings (`COMMENT` or `REQUEST_CHANGES`). Approval is computed deterministically by the tally engine from the absence of unresolved blocking findings.

### Principle 2: Invariants are the Gate, Votes are Triage
Reviewer seats provide heuristic analysis and line-by-line feedback. But **a merge is never authorized by LLM votes alone**.
The hard gate consists of deterministic invariants:
1. All repository CI checks (linting, build, unit/e2e tests) exit 0.
2. Secret scanning (Gitleaks / detect-secrets) exits 0 with zero leaked tokens.
3. Edit surface constraint: diff files are confined to authorized paths (no tampering with CI workflows, lockfiles or governance rules).
4. **The Overlap Check:** Verifies whether `main` has advanced and modified any of the files touched by the PR since the PR's CI run. If an overlap is detected, branch rebase/update is mandatory before merge.

### Principle 3: Tamper-Evident Iteration Budget
- Agents attempting to fix reviewer findings are granted at most **3 correction rounds**.
- The iteration counter is owned by the GitHub Actions tally state, reconciled against GitHub Actions run history — **never stored in editable agent context or commit messages**.
- If the budget is exhausted without reaching clean approval, the PR is automatically marked `NEEDS_HUMAN_INTERVENTION` and execution stops.

---

## 4. Architecture of `agentic-pr-review-gh-action`

```text
       [ Pull Request Event (opened / synchronize) ]
                            │
                            ▼
           ┌─────────────────────────────────┐
           │     0. Invariant Pre-flight     │
           │  - Secret Scan (Gitleaks)       │
           │  - Allowed Edit Surfaces        │
           │  - Overlap Check vs main        │
           └────────────────┬────────────────┘
                            │ (pass)
                            ▼
           ┌─────────────────────────────────┐
           │    1. Three-Seat Tribunal       │
           │  ┌──────────┬──────────┬──────┐ │
           │  │  Seat A  │  Seat B  │Seat C│ │
           │  │ (Logic)  │ (Tests)  │(KISS)│ │
           │  └──────────┴──────────┴──────┘ │
           └────────────────┬────────────────┘
                            │
                            ▼
           ┌─────────────────────────────────┐
           │      2. Deterministic Tally     │
           │  - Collects Line Comments       │
           │  - Checks Blocking Findings     │
           │  - Increments Iteration Counter │
           └────────────────┬────────────────┘
                            │
               ┌────────────┴────────────┐
               │                         │
     [ Blockers Found ]         [ Zero Blockers ]
               │                         │
               ▼                         ▼
   ┌───────────────────────┐  ┌───────────────────────┐
   │ Check Budget (<= 3)   │  │ Verify CI Status      │
   │ - Loop agent to fix   │  │ - Green checks?       │
   │ - Or tag Needs Human  │  │ - Run Merge Gate      │
   └───────────────────────┘  └───────────────────────┘
```

---

## 5. Security & Isolation Considerations

1. **Token Steering & Least Privilege:**
   - The tribunal action requires `contents: read`, `pull-requests: write`, `issues: write`.
   - Never expose administrative or deploy tokens to the review runners.
2. **Prompt Injection Defense:**
   - Reviewer prompts treat PR titles, PR descriptions, and code comments as **untrusted data**.
   - Input delimiters and boundary markers protect reviewer instructions from being overridden by malicious PR contents.
3. **Emergency Kill Switch:**
   - Label `governance:bypass` (authorized operators only) or workflow setting `tribunal_enabled: false` immediately bypasses the action for critical operational fixes.

---

## 6. Implementation Roadmap

- **Phase 1: Foundation & Overlap Gate**
  - Action entrypoint (`action.yml`).
  - Git overlap checker script (`check-overlap.sh`).
  - Secret & protected paths invariant checker.
- **Phase 2: Reviewer Engine & Prompts**
  - Model adapter (Anthropic Claude, DeepSeek, OpenAI).
  - Prompts for Seats A, B, and C.
  - GitHub PR review comment publisher.
- **Phase 3: Deterministic Tally & Budgeting**
  - Tally logic calculating approval vs request-changes.
  - Iteration budget tracker (GitHub Action run history based).
  - Auto-merge / Auto-approve gate.
