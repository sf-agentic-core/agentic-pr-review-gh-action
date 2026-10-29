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
export function matchGlob(path: string, pattern: string): boolean {
  // Normalize leading slashes
  const normalizedPath = path.replace(/^\/+/, '');
  const normalizedPattern = pattern.replace(/^\/+/, '');

  if (normalizedPattern === normalizedPath) {
    return true;
  }

  // Escape special regex characters except '*'
  let regexPattern = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '§§GLOBSTAR§§')
    .replace(/\*/g, '[^/]*')
    .replace(/§§GLOBSTAR§§/g, '.*');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(normalizedPath);
}

/**
 * Validates that PR diff modifications:
 * 1. Do NOT touch any protected patterns (CI configurations, lockfiles, secrets).
 * 2. Fall strictly within allowed patterns (if explicitly constrained).
 */
export function validateEditSurfaces(options: EditSurfacesOptions): EditSurfacesResult {
  const { changedFiles, protectedPatterns = [], allowedPatterns } = options;
  const violations: string[] = [];

  for (const file of changedFiles) {
    // 1. Check protected patterns
    const isProtected = protectedPatterns.some((pattern) => matchGlob(file, pattern));
    if (isProtected) {
      violations.push(file);
      continue;
    }

    // 2. Check allowed patterns (if configured)
    if (allowedPatterns && allowedPatterns.length > 0) {
      const isAllowed = allowedPatterns.some((pattern) => matchGlob(file, pattern));
      if (!isAllowed) {
        violations.push(file);
      }
    }
  }

  const isValid = violations.length === 0;
  return {
    isValid,
    violations,
    reason: isValid ? undefined : `Modifications detected on prohibited or unauthorized surfaces: ${violations.join(', ')}`,
  };
}
