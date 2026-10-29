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
export declare function detectGitOverlap(options: OverlapCheckOptions): Promise<OverlapResult>;
