import { detectGitOverlap, type GitExecFn, type OverlapResult } from './overlap.js';
import { validateEditSurfaces, type EditSurfacesResult } from './surfaces.js';
import { runSecretScan, type CommandExecFn, type SecretScanResult } from './secrets.js';

export interface PreflightOptions {
  baseRef: string;
  headRef: string;
  execGit: GitExecFn;
  execCommand: CommandExecFn;
  checkOverlap?: boolean;
  checkSecrets?: boolean;
  failOnScannerMissing?: boolean;
  protectedPatterns?: string[];
  allowedPatterns?: string[];
}

export interface PreflightSummary {
  success: boolean;
  failedStep?: 'git-overlap' | 'edit-surfaces' | 'secrets';
  reasons: string[];
  overlapResult?: OverlapResult;
  surfacesResult: EditSurfacesResult;
  secretsResult?: SecretScanResult;
}

/**
 * Executes the complete pre-flight invariants pipeline:
 * 1. Collects changed files on branch.
 * 2. Validates edit surfaces against protected & allowed patterns.
 * 3. Detects git overlap / concurrent main drift hazards.
 * 4. Runs secret scanning (Gitleaks).
 */
export async function runPreflightInvariants(options: PreflightOptions): Promise<PreflightSummary> {
  const {
    baseRef,
    headRef,
    execGit,
    execCommand,
    checkOverlap = true,
    checkSecrets = true,
    failOnScannerMissing = false,
    protectedPatterns = [
      '.github/workflows/**',
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      '.env*',
    ],
    allowedPatterns,
  } = options;

  const reasons: string[] = [];

  // Step 1: Detect branch files
  const branchDiffOutput = await execGit(['diff', '--name-only', `${baseRef}...${headRef}`]);
  const branchFiles = branchDiffOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Step 2: Validate edit surfaces
  const surfacesResult = validateEditSurfaces({
    changedFiles: branchFiles,
    protectedPatterns,
    allowedPatterns,
  });

  if (!surfacesResult.isValid) {
    reasons.push(surfacesResult.reason || 'Prohibited edit surfaces modified');
    return {
      success: false,
      failedStep: 'edit-surfaces',
      reasons,
      surfacesResult,
    };
  }

  // Step 3: Git Overlap Check
  let overlapResult: OverlapResult | undefined;
  if (checkOverlap) {
    overlapResult = await detectGitOverlap({
      baseRef,
      headRef,
      execGit,
    });

    if (overlapResult.hasOverlap) {
      const filesMsg = overlapResult.overlappingFiles.join(', ');
      reasons.push(
        `Git merge hazard: ${overlapResult.overlappingFiles.length} file(s) modified in branch were also modified in ${baseRef}: ${filesMsg}`
      );
      return {
        success: false,
        failedStep: 'git-overlap',
        reasons,
        overlapResult,
        surfacesResult,
      };
    }
  }

  // Step 4: Secret Scanning Check
  let secretsResult: SecretScanResult | undefined;
  if (checkSecrets) {
    secretsResult = await runSecretScan({
      execCommand,
      failOnScannerMissing,
    });

    if (!secretsResult.isValid) {
      reasons.push(secretsResult.reason || 'Secret scanning check failed');
      return {
        success: false,
        failedStep: 'secrets',
        reasons,
        overlapResult,
        surfacesResult,
        secretsResult,
      };
    }
  }

  return {
    success: true,
    reasons,
    overlapResult,
    surfacesResult,
    secretsResult,
  };
}

export * from './overlap.js';
export * from './surfaces.js';
export * from './secrets.js';
