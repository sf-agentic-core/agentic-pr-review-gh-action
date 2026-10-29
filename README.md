# Agentic PR Review GitHub Action 🤖⚖️🛡️

> **Sovereign, model-agnostic GitHub Action for agentic code governance, synthetic review tribunals, and automated PR verification.**

Inspired by [PR-008: The Synthetic Review Tribunal](docs/proposals/PR-008-synthetic-review-tribunal.md) and designed to break the review bottleneck of machine-authored pull requests without relying on opaque commercial SaaS (Qodo/Greptile).

---

## 🎯 The Problem

When coding agents generate pull requests at scale, **human engineers become the primary bottleneck**:
- Diffs pile up faster than humans can review them.
- Manual approvals turn into fatigue-driven rubber-stamping.
- Agents retry in infinite hallucination loops unless bounded by strict correction budgets.
- Two green PRs can pass CI in isolation but break `main` when merged together due to **semantic file overlap**.

## ⚖️ The Solution: The Synthetic Review Tribunal

This action shifts trust from the individual code diff to the **validation harness**:
1. **Three-Seat Review Tribunal**:
   - **Seat A (Correctness & Logic)**: Edge cases, logic regressions, contract conformance.
   - **Seat B (Test Quality & Boundaries)**: Test adequacy, mutation resistance, public interface assertions.
   - **Seat C (Simplification & Cognitive Load)**: Dead code, over-engineering, unrequested complexity.
2. **Asymmetric Quorum**: Approval requires a majority; **blocking needs only one seat**.
3. **Invariants as the Hard Gate**: Reviewer votes only provide triage; machine-checkable invariants (tests, linters, security scans, overlap checks) form the merge gate.
4. **Git Overlap Verification**: Detects if `main` modified the PR's target files since its CI baseline ran, preventing silent merge races.
5. **Tamper-Evident Correction Budget**: Bounds retry loops (default: 3 iterations max).

---

## 🚀 Usage

```yaml
name: Agentic PR Review
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review-tribunal:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
      checks: read
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Review Tribunal
        uses: sf-agentic-core/agentic-pr-review-gh-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          provider: 'anthropic' # or 'deepseek', 'openai'
          api-key: ${{ secrets.AI_API_KEY }}
          model: 'claude-3-5-sonnet-latest'
          max-corrections: 3
          strict-invariants: true
          check-overlap: true
```

---

## 📖 Proposals & Roadmap

- Read the foundational specification: [PR-008: Agentic Code Governance — The Synthetic Review Tribunal](docs/proposals/PR-008-synthetic-review-tribunal.md)
- Follow the milestones on GitHub: [Milestone v1.0.0 — Synthetic Review Tribunal Engine](https://github.com/sf-agentic-core/agentic-pr-review-gh-action/milestones)

---

## 📄 License

MIT © [Saul Fernandez](https://github.com/Sarony11) & [Tachikoma Platform](https://github.com/sf-agentic-core).
