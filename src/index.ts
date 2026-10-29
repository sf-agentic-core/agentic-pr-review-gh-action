import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import { runPreflightInvariants, type GitExecFn, type CommandExecFn } from './invariants/index.js';
import { runTribunal } from './tribunal/runner.js';
import type { LLMProvider, PullRequestMetadata } from './tribunal/types.js';
import { calculateQuorum } from './tally/tally.js';
import { publishPullRequestReview } from './tally/publisher.js';

export async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true });
    const baseRef = core.getInput('base-ref') || 'origin/main';
    const headRef = core.getInput('head-ref') || 'HEAD';
    const checkOverlap = core.getBooleanInput('check-overlap');
    const strictInvariants = core.getBooleanInput('strict-invariants');
    const provider = (core.getInput('provider') || 'anthropic') as LLMProvider;
    const apiKey = core.getInput('api-key');
    const model = core.getInput('model') || 'claude-3-5-sonnet-latest';

    core.info('🔎 Phase 0: Running Invariant Pre-flight Checks...');

    const execGit: GitExecFn = async (args: string[]) => {
      let output = '';
      await exec.exec('git', args, {
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString();
          },
        },
        silent: true,
      });
      return output;
    };

    const execCommand: CommandExecFn = async (command: string, args: string[]) => {
      let stdout = '';
      let stderr = '';
      const exitCode = await exec.exec(command, args, {
        listeners: {
          stdout: (data: Buffer) => {
            stdout += data.toString();
          },
          stderr: (data: Buffer) => {
            stderr += data.toString();
          },
        },
        ignoreReturnCode: true,
        silent: true,
      });
      return { exitCode, stdout, stderr };
    };

    const preflight = await runPreflightInvariants({
      baseRef,
      headRef,
      execGit,
      execCommand,
      checkOverlap,
      checkSecrets: strictInvariants,
      failOnScannerMissing: false,
    });

    if (preflight.overlapResult?.hasOverlap) {
      core.setOutput('overlap-detected', 'true');
    } else {
      core.setOutput('overlap-detected', 'false');
    }

    if (!preflight.success) {
      core.setFailed(`Invariant Pre-flight failed: ${preflight.reasons.join(' | ')}`);
      return;
    }

    core.info('✅ Invariant Pre-flight passed cleanly.');

    // Phase 1: Review Tribunal Execution
    if (!apiKey) {
      core.warning('⚠️ No api-key provided. Skipping Synthetic Review Tribunal.');
      core.setOutput('verdict', 'APPROVED');
      core.setOutput('blockers-count', '0');
      return;
    }

    core.info(`🏛️ Phase 1: Invoking Three-Seat Synthetic Review Tribunal (${provider} / ${model})...`);

    // Obtain diff
    const diff = await execGit(['diff', `${baseRef}...${headRef}`]);

    const context = github.context;
    const prPayload = context.payload.pull_request;

    const pr: PullRequestMetadata = {
      title: prPayload?.title || 'Local / Non-PR Invocation',
      description: prPayload?.body || '',
      author: prPayload?.user?.login || 'unknown',
      baseRef,
      headRef,
      diff,
    };

    const tribunal = await runTribunal({
      pr,
      provider,
      apiKey,
      model,
    });

    core.info(`⚖️ Tribunal completed. Tokens used: ${tribunal.totalTokensUsed}`);

    // Phase 2: Asymmetric Quorum Tally & Review Publishing
    core.info('📊 Phase 2: Computing Asymmetric Quorum Decision...');
    const decision = calculateQuorum(tribunal.seatResults);

    for (const seat of tribunal.seatResults) {
      core.info(`- ${seat.seatName}: ${seat.vote} (${seat.findings.length} findings)`);
    }

    core.setOutput('verdict', decision.verdict);
    core.setOutput('blockers-count', String(decision.blockers.length));

    // Publish review on GitHub PR if running in a pull request context
    if (prPayload && prPayload.number && context.repo) {
      core.info(`📝 Publishing review to PR #${prPayload.number}...`);
      const octokit = github.getOctokit(token);
      const commitSha = prPayload.head?.sha || headRef;

      try {
        const reviewId = await publishPullRequestReview({
          octokit,
          owner: context.repo.owner,
          repo: context.repo.repo,
          pullNumber: prPayload.number,
          commitSha,
          decision,
          seatResults: tribunal.seatResults,
        });
        core.info(`✅ Review published successfully (ID: ${reviewId}).`);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        core.warning(`Failed to publish GitHub PR review comment: ${errMsg}`);
      }
    }

    if (decision.verdict === 'REQUEST_CHANGES') {
      core.setFailed(`Tribunal rejected PR: ${decision.blockers.length} blocking finding(s) detected.`);
    } else {
      core.info('🎉 Tribunal APPROVED pull request.');
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed(String(error));
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  run();
}
