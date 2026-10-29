import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import { runPreflightInvariants, type GitExecFn, type CommandExecFn } from './invariants/index.js';
import { runTribunal } from './tribunal/runner.js';
import type { LLMProvider, PullRequestMetadata, SeatExecutionConfig, SeatId } from './tribunal/types.js';
import { calculateQuorum } from './tally/tally.js';
import { publishPullRequestReview } from './tally/publisher.js';
import { exportTribunalArtifacts } from './tally/export.js';
import { countCorrectionRounds, checkBudgetStatus } from './budget/budget.js';
import { escalateToHuman } from './budget/escalation.js';
import { evaluateMergeGate } from './budget/gate.js';

export async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true });
    const baseRef = core.getInput('base-ref') || 'origin/main';
    const headRef = core.getInput('head-ref') || 'HEAD';
    const checkOverlap = core.getBooleanInput('check-overlap');
    const strictInvariants = core.getBooleanInput('strict-invariants');
    const autoMergeRequested = core.getBooleanInput('auto-merge');
    const mergeMethod = (core.getInput('merge-method') || 'squash') as 'squash' | 'merge' | 'rebase';
    const maxCorrections = parseInt(core.getInput('max-corrections') || '3', 10);
    const provider = (core.getInput('provider') || 'anthropic') as LLMProvider;
    const apiKey = core.getInput('api-key');
    const model = core.getInput('model') || 'claude-sonnet-4-6';

    const context = github.context;
    const prPayload = context.payload.pull_request;
    const octokit = github.getOctokit(token);

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

    // Phase 1: Budget and Iteration Guard
    if (prPayload && prPayload.number && context.repo) {
      core.info('⏱️ Phase 1: Checking Tamper-Evident Correction Budget...');
      try {
        const { data: reviews } = await octokit.rest.pulls.listReviews({
          owner: context.repo.owner,
          repo: context.repo.repo,
          pull_number: prPayload.number,
        });

        const currentRounds = countCorrectionRounds(reviews);
        const budget = checkBudgetStatus({
          currentCorrections: currentRounds,
          maxCorrections,
        });

        core.info(`- Correction rounds used: ${currentRounds}/${maxCorrections}`);

        if (budget.isExhausted) {
          core.warning(`⚠️ ${budget.reason}`);
          core.setOutput('budget-exhausted', 'true');
          core.setOutput('verdict', 'BLOCKED');

          await escalateToHuman({
            octokit,
            owner: context.repo.owner,
            repo: context.repo.repo,
            pullNumber: prPayload.number,
            roundsUsed: currentRounds,
            maxRounds: maxCorrections,
            lastBlockersCount: 1,
          });

          core.setFailed(budget.reason || 'Correction budget exhausted.');
          return;
        }

        core.setOutput('budget-exhausted', 'false');
      } catch (err: unknown) {
        core.warning(`Could not inspect review history for budget check: ${String(err)}`);
      }
    }

    // Phase 2: Review Tribunal Execution
    const seatConfigs: Partial<Record<SeatId, SeatExecutionConfig>> = {};

    const resolveSeatConfig = (
      seatId: SeatId,
      prefix: 'seat-a' | 'seat-b' | 'seat-c'
    ): SeatExecutionConfig | undefined => {
      const sProvider = (core.getInput(`${prefix}-provider`) || provider) as LLMProvider;
      const sKey = core.getInput(`${prefix}-api-key`) || apiKey;
      const sModel = core.getInput(`${prefix}-model`) || model;

      if (sKey && sModel && sProvider) {
        return {
          provider: sProvider,
          apiKey: sKey,
          model: sModel,
        };
      }
      return undefined;
    };

    const configA = resolveSeatConfig('seat-a', 'seat-a');
    const configB = resolveSeatConfig('seat-b', 'seat-b');
    const configC = resolveSeatConfig('seat-c', 'seat-c');

    if (configA) seatConfigs['seat-a'] = configA;
    if (configB) seatConfigs['seat-b'] = configB;
    if (configC) seatConfigs['seat-c'] = configC;

    const hasAnyConfig = Boolean(
      apiKey || configA?.apiKey || configB?.apiKey || configC?.apiKey
    );

    if (!hasAnyConfig) {
      core.warning('⚠️ No api-key or per-seat API keys provided. Skipping Synthetic Review Tribunal.');
      core.setOutput('verdict', 'APPROVED');
      core.setOutput('blockers-count', '0');
      return;
    }

    core.info(
      `🏛️ Phase 2: Invoking Three-Seat Synthetic Review Tribunal (Seat A: ${configA?.provider || provider}/${configA?.model || model}, Seat B: ${configB?.provider || provider}/${configB?.model || model}, Seat C: ${configC?.provider || provider}/${configC?.model || model})...`
    );

    // Obtain diff
    const diff = await execGit(['diff', `${baseRef}...${headRef}`]);

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
      seatConfigs,
    });

    core.info(`⚖️ Tribunal completed. Tokens used: ${tribunal.totalTokensUsed}`);

    // Phase 3: Asymmetric Quorum Tally & Review Publishing
    core.info('📊 Phase 3: Computing Asymmetric Quorum Decision...');
    const decision = calculateQuorum(tribunal.seatResults);

    for (const seat of tribunal.seatResults) {
      core.info(`- ${seat.seatName}: ${seat.vote} (${seat.findings.length} findings)`);
    }

    core.setOutput('verdict', decision.verdict);
    core.setOutput('blockers-count', String(decision.blockers.length));

    // Export local artifacts to disk (.tribunal/review.md & .tribunal/verdict.json)
    const artifactDir = core.getInput('artifact-dir') || '.tribunal';
    try {
      const exported = await exportTribunalArtifacts({
        outputDir: artifactDir,
        decision,
        seatResults: tribunal.seatResults,
      });
      core.info(`💾 Local tribunal artifacts written: ${exported.markdownPath} and ${exported.jsonPath}`);
    } catch (exportErr) {
      core.warning(`Failed to export tribunal artifacts: ${String(exportErr)}`);
    }

    // Publish review on GitHub PR if running in a pull request context
    if (prPayload && prPayload.number && context.repo) {
      core.info(`📝 Publishing review to PR #${prPayload.number}...`);
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

      // Phase 4: Auto-merge Gate Evaluation
      core.info('🚪 Phase 4: Evaluating Auto-merge Gate...');
      const mergeResult = await evaluateMergeGate({
        octokit,
        owner: context.repo.owner,
        repo: context.repo.repo,
        pullNumber: prPayload.number,
        autoMergeRequested,
        preflight,
        decision,
        mergeMethod,
      });

      core.setOutput('merged', mergeResult.merged ? 'true' : 'false');
      core.setOutput('ready-to-merge', mergeResult.authorized ? 'true' : 'false');
      core.info(`- Auto-merge result: ${mergeResult.reason}`);
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
