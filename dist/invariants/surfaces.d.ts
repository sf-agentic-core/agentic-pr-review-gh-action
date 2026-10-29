export interface EditSurfacesOptions {
    changedFiles: string[];
    protectedPatterns?: string[];
    allowedPatterns?: string[];
}
export interface EditSurfacesResult {
    isValid: boolean;
    violations: string[];
    reason?: string;
}
/**
 * Matches a relative file path against a simple glob pattern.
 * Supports:
 * - '**' for arbitrary nested directory paths
 * - '*' for wildcard within a single path segment or file extension
 */
export declare function matchGlob(path: string, pattern: string): boolean;
/**
 * Validates that PR diff modifications:
 * 1. Do NOT touch any protected patterns (CI configurations, lockfiles, secrets).
 * 2. Fall strictly within allowed patterns (if explicitly constrained).
 */
export declare function validateEditSurfaces(options: EditSurfacesOptions): EditSurfacesResult;
