import type { CommandExecFn } from './secrets.js';

export interface ShellBlock {
  file: string;
  script: string;
  line?: number;
}

export interface ShellSyntaxError {
  file: string;
  line?: number;
  error: string;
  snippet?: string;
}

export interface ShellValidationOptions {
  diff: string;
  execCommand: CommandExecFn;
}

export interface ShellValidationResult {
  isValid: boolean;
  syntaxErrors: ShellSyntaxError[];
  blocksChecked: number;
}

/**
 * Extracts shell scripts from diff:
 * 1. From files ending in `.sh` or `.bash`
 * 2. From `run: |` or `run: >` multi-line/single-line blocks in `.github/workflows/*.ya?ml`
 */
export function extractShellBlocksFromDiff(diff: string): ShellBlock[] {
  const blocks: ShellBlock[] = [];
  const fileDiffs = diff.split(/^diff --git /m);

  for (const fileDiff of fileDiffs) {
    if (!fileDiff.trim()) continue;

    const fileMatch = fileDiff.match(/^[ab]\/(\S+)\s+[ab]\/(\S+)/m);
    if (!fileMatch) continue;

    const filePath = fileMatch[2];
    const isShellFile = filePath.endsWith('.sh') || filePath.endsWith('.bash');
    const isWorkflowFile = /\.github\/workflows\/.*\.ya?ml$/.test(filePath);

    if (!isShellFile && !isWorkflowFile) continue;

    // Collect added lines from diff (+ lines, excluding header +++)
    const lines = fileDiff.split('\n');
    const addedLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('+++')) continue;
      if (line.startsWith('+')) {
        addedLines.push(line.slice(1));
      }
    }

    if (addedLines.length === 0) continue;

    if (isShellFile) {
      blocks.push({
        file: filePath,
        script: addedLines.join('\n'),
      });
    } else if (isWorkflowFile) {
      // Extract run: blocks from added workflow lines
      let currentRunBlock: string[] | null = null;
      let runBlockIndent = -1;

      for (let i = 0; i < addedLines.length; i++) {
        const line = addedLines[i];
        const runMatch = line.match(/^(\s*)run:\s*([|>]?)\s*(.*)$/);

        if (runMatch) {
          if (currentRunBlock && currentRunBlock.length > 0) {
            blocks.push({
              file: filePath,
              script: currentRunBlock.join('\n'),
            });
          }

          const indent = runMatch[1].length;
          const inlineScript = runMatch[3].trim();

          if (inlineScript && !runMatch[2]) {
            // Single-line run: script
            blocks.push({
              file: filePath,
              script: inlineScript,
            });
            currentRunBlock = null;
            runBlockIndent = -1;
          } else {
            // Multi-line block
            currentRunBlock = [];
            runBlockIndent = indent;
          }
          continue;
        }

        if (currentRunBlock !== null) {
          const lineIndent = line.search(/\S/);
          if (lineIndent > runBlockIndent || line.trim() === '') {
            currentRunBlock.push(line);
          } else {
            // End of run: block
            if (currentRunBlock.length > 0) {
              blocks.push({
                file: filePath,
                script: currentRunBlock.join('\n'),
              });
            }
            currentRunBlock = null;
            runBlockIndent = -1;
          }
        }
      }

      if (currentRunBlock && currentRunBlock.length > 0) {
        blocks.push({
          file: filePath,
          script: currentRunBlock.join('\n'),
        });
      }
    }
  }

  return blocks;
}

/**
 * Validates shell syntax deterministically using `bash -n` (no execution).
 * Sanitizes GitHub Actions expressions ${{ ... }} with safe shell placeholders before checking.
 */
export async function validateShellSyntax(
  options: ShellValidationOptions
): Promise<ShellValidationResult> {
  const { diff, execCommand } = options;
  const blocks = extractShellBlocksFromDiff(diff);
  const syntaxErrors: ShellSyntaxError[] = [];

  for (const block of blocks) {
    // Sanitize GitHub Actions expressions: ${{ ... }} -> "__GHA_EXPR__"
    const sanitizedScript = block.script.replace(/\$\{\{[^}]+\}\}/g, '"__GHA_EXPR__"');

    // Run bash -n via bash -c 'bash -n << "EOF"\n...\nEOF'
    try {
      const res = await execCommand('bash', ['-n', '-c', sanitizedScript]);

      if (res.exitCode !== 0) {
        syntaxErrors.push({
          file: block.file,
          error: res.stderr || res.stdout || 'Unknown shell syntax error',
          snippet: block.script.slice(0, 200),
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      syntaxErrors.push({
        file: block.file,
        error: `Failed to execute syntax check: ${errorMsg}`,
        snippet: block.script.slice(0, 200),
      });
    }
  }

  return {
    isValid: syntaxErrors.length === 0,
    syntaxErrors,
    blocksChecked: blocks.length,
  };
}
