import { describe, it, expect, vi } from 'vitest';
import {
  extractShellBlocksFromDiff,
  validateShellSyntax,
  type ShellValidationOptions,
} from './shell.js';

describe('extractShellBlocksFromDiff', () => {
  it('extracts shell blocks from modified .sh files in diff', () => {
    const diff = `diff --git a/scaffolder/validate.sh b/scaffolder/validate.sh
--- a/scaffolder/validate.sh
+++ b/scaffolder/validate.sh
@@ -10,3 +10,4 @@
+echo "hello world"
+exit 0`;

    const blocks = extractShellBlocksFromDiff(diff);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].file).toBe('scaffolder/validate.sh');
    expect(blocks[0].script).toContain('echo "hello world"');
  });

  it('extracts run: step blocks from .github/workflows/*.yaml files', () => {
    const diff = `diff --git a/.github/workflows/deploy.yml b/.github/workflows/deploy.yml
new file mode 100644
--- /dev/null
+++ b/.github/workflows/deploy.yml
@@ -0,0 +1,10 @@
+name: Deploy
+jobs:
+  build:
+    steps:
+      - name: Build app
+        run: |
+          npm install
+          npm run build
+          echo "Done"`;

    const blocks = extractShellBlocksFromDiff(diff);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].file).toBe('.github/workflows/deploy.yml');
    expect(blocks[0].script).toContain('npm install');
  });
});

describe('validateShellSyntax', () => {
  it('passes when all shell blocks have valid syntax', async () => {
    const mockExec = vi.fn(async () => ({ exitCode: 0, stdout: '', stderr: '' }));

    const options: ShellValidationOptions = {
      diff: `diff --git a/script.sh b/script.sh
+++ b/script.sh
@@ -1 +1,2 @@
+if [ -f "foo" ]; then echo "bar"; fi`,
      execCommand: mockExec,
    };

    const result = await validateShellSyntax(options);
    expect(result.isValid).toBe(true);
    expect(result.syntaxErrors).toHaveLength(0);
  });

  it('detects syntax error like unclosed subshell $( or unclosed quote', async () => {
    const mockExec = vi.fn(async () => ({
      exitCode: 2,
      stdout: '',
      stderr: 'syntax error: unexpected EOF while looking for matching `)`',
    }));

    const options: ShellValidationOptions = {
      diff: `diff --git a/.github/workflows/test.yml b/.github/workflows/test.yml
+++ b/.github/workflows/test.yml
@@ -1,5 +1,5 @@
+      - name: Broken script
+        run: |
+          response=$(gh api ...`,
      execCommand: mockExec,
    };

    const result = await validateShellSyntax(options);
    expect(result.isValid).toBe(false);
    expect(result.syntaxErrors).toHaveLength(1);
    expect(result.syntaxErrors[0].error).toContain('syntax error: unexpected EOF');
  });
});
