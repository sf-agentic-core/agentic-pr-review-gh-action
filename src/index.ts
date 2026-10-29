import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { runPreflightInvariants, type GitExecFn, type CommandExecFn } from './invariants/index.js';

export async function run(): Promise<void> {
  try {
    const baseRef = core.getInput('base-ref') || 'origin/main';
    const headRef = core.getInput('head-ref') || 'HEAD';
    const checkOverlap = core.getBooleanInput('check-overlap');
    const strictInvariants = core.getBooleanInput('strict-invariants');

    core.info('🔎 Running Invariant Pre-flight Checks...');

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
