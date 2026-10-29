export type GitExecFn = (args: string[]) => Promise<string>;

export interface OverlapCheckOptions {
  baseRef: string;
  headRef: string;
  execGit: GitExecFn;
}

export interface OverlapResult {
  hasOverlap: boolean;
  overlappingFiles: string[];
  branchFiles: string[];
  mainDriftFiles: string[];
}

/**
 * Detects whether origin/main (or baseRef) has modified any files that this branch
 * has modified since the common merge-base ancestor.
 *
 * Algorithm:
 * 1. Identify files modified on the branch: git diff --name-only <baseRef>...<headRef>
 * 2. Find merge-base commit: git merge-base <baseRef> <headRef>
 * 3. Identify files modified on baseRef since merge-base: git diff --name-only <merge-base>..<baseRef>
 * 4. Intersect the two sets. If intersection is non-empty, a merge hazard exists.
 */
export async function detectGitOverlap(options: OverlapCheckOptions): Promise<OverlapResult> {
  const { baseRef, headRef, execGit } = options;

  // 1. Files modified by branch
  const branchDiffOutput = await execGit(['diff', '--name-only', `${baseRef}...${headRef}`]);
  const branchFiles = parseFileList(branchDiffOutput);

  if (branchFiles.length === 0) {
    return {
      hasOverlap: false,
      overlappingFiles: [],
      branchFiles: [],
      mainDriftFiles: [],
    };
  }

  // 2. Merge base
  const mergeBaseRaw = await execGit(['merge-base', baseRef, headRef]);
  const mergeBase = mergeBaseRaw.trim();

  // 3. Files modified on baseRef since merge-base
  let mainDriftFiles: string[] = [];
  if (mergeBase) {
    const mainDiffOutput = await execGit(['diff', '--name-only', `${mergeBase}..${baseRef}`]);
    mainDriftFiles = parseFileList(mainDiffOutput);
  }

  // 4. Set intersection
  const mainDriftSet = new Set(mainDriftFiles);
  const overlappingFiles = branchFiles.filter((file) => mainDriftSet.has(file));

  return {
    hasOverlap: overlappingFiles.length > 0,
    overlappingFiles,
    branchFiles,
    mainDriftFiles,
  };
}

function parseFileList(rawOutput: string): string[] {
  return rawOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
