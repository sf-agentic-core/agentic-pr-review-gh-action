#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { runTribunal } from './tribunal/runner.js';
import { calculateQuorum } from './tally/tally.js';
import { exportTribunalArtifacts } from './tally/export.js';
import { formatReviewBody } from './tally/formatter.js';
import type { PullRequestMetadata, LLMProvider, SeatExecutionConfig, SeatId } from './tribunal/types.js';

/**
 * Standalone CLI runner for reviewing any local or remote PR branch.
 * Usage:
 *   npx tsx src/cli.ts [--pr <url_or_number>] [--base <branch>] [--post-comment]
 */
async function main() {
  const args = process.argv.slice(2);
  const prArgIndex = args.indexOf('--pr');
  const prTarget = prArgIndex !== -1 ? args[prArgIndex + 1] : undefined;
  const shouldPostComment = args.includes('--post-comment');

  let title = 'Local Branch Review';
  let description = '';
  let author = 'local-user';
  let baseRef = 'origin/main';
  let headRef = 'HEAD';
  let prNumber: number | undefined;

  const baseArgIndex = args.indexOf('--base');
  if (baseArgIndex !== -1 && args[baseArgIndex + 1]) {
    baseRef = args[baseArgIndex + 1];
  }

  if (prTarget) {
    console.log(`📡 Fetching PR metadata for ${prTarget}...`);
    const prRaw = execSync(`gh pr view ${prTarget} --json number,title,body,author,baseRefName,headRefName`, {
      encoding: 'utf-8',
    });
    const prJson = JSON.parse(prRaw);
    title = prJson.title;
    description = prJson.body;
    author = prJson.author.login;
    baseRef = prJson.baseRefName;
    headRef = prJson.headRefName;
    prNumber = prJson.number;
  }

  console.log(`🔎 Extracting diff vs ${baseRef}...`);
  const diffCmd = prTarget ? `gh pr diff ${prTarget}` : `git diff ${baseRef}...${headRef}`;
  const diff = execSync(diffCmd, { encoding: 'utf-8', maxBuffer: 15 * 1024 * 1024 });

  const provider = (process.env.PROVIDER || 'anthropic') as LLMProvider;
  const apiKey = process.env.API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY || '';
  const model = process.env.MODEL || (provider === 'anthropic' ? 'claude-sonnet-4-6' : provider === 'deepseek' ? 'deepseek-chat' : provider === 'google' ? 'gemini-2.5-flash' : 'gpt-4o');

  // Support per-seat environment overrides
  const seatConfigs: Partial<Record<SeatId, SeatExecutionConfig>> = {};

  const resolveEnvSeat = (seatId: SeatId, prefix: string) => {
    const sProv = (process.env[`${prefix}_PROVIDER`] || provider) as LLMProvider;
    const sKey = process.env[`${prefix}_API_KEY`] || apiKey;
    const sMod = process.env[`${prefix}_MODEL`] || model;
    if (sKey && sMod && sProv) {
      seatConfigs[seatId] = { provider: sProv, apiKey: sKey, model: sMod };
    }
  };

  resolveEnvSeat('seat-a', 'SEAT_A');
  resolveEnvSeat('seat-b', 'SEAT_B');
  resolveEnvSeat('seat-c', 'SEAT_C');

  const hasAnyKey = Boolean(apiKey || seatConfigs['seat-a']?.apiKey || seatConfigs['seat-b']?.apiKey || seatConfigs['seat-c']?.apiKey);

  if (!hasAnyKey) {
    console.error('❌ Missing API key for LLM provider (provide API_KEY or SEAT_{A,B,C}_API_KEY)');
    process.exit(1);
  }

  const pr: PullRequestMetadata = {
    title,
    description,
    author,
    baseRef,
    headRef,
    diff,
  };

  console.log(`🏛️ Running Synthetic Review Tribunal...`);
  if (seatConfigs['seat-a']) console.log(`- Seat A: ${seatConfigs['seat-a'].provider} / ${seatConfigs['seat-a'].model}`);
  if (seatConfigs['seat-b']) console.log(`- Seat B: ${seatConfigs['seat-b'].provider} / ${seatConfigs['seat-b'].model}`);
  if (seatConfigs['seat-c']) console.log(`- Seat C: ${seatConfigs['seat-c'].provider} / ${seatConfigs['seat-c'].model}`);

  const tribunal = await runTribunal({
    pr,
    provider,
    apiKey,
    model,
    seatConfigs,
  });

  const decision = calculateQuorum(tribunal.seatResults);

  // 1. Export local artifacts
  const exported = await exportTribunalArtifacts({
    outputDir: '.tribunal',
    decision,
    seatResults: tribunal.seatResults,
  });

  console.log(`\n💾 Review artifacts generated:`);
  console.log(`- Markdown: ${exported.markdownPath}`);
  console.log(`- JSON:     ${exported.jsonPath}`);

  // 2. Post PR comment if requested
  if (shouldPostComment && prTarget) {
    console.log(`\n📝 Publishing review comment to ${prTarget}...`);
    const reviewBody = formatReviewBody(decision, tribunal.seatResults);
    execSync(`gh pr comment ${prTarget} --body-file ${exported.markdownPath}`);
    console.log(`✅ Review comment successfully published to GitHub PR!`);
  }

  console.log(`\n======================================================`);
  console.log(`VERDICT: ${decision.verdict} (${decision.blockers.length} blockers)`);
  console.log(`SUMMARY: ${decision.summary}`);
  console.log(`======================================================`);

  if (decision.verdict === 'REQUEST_CHANGES') {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Tribunal CLI Error:', err);
  process.exit(1);
});
