import { describe, it, expect } from 'vitest';
import { validateEditSurfaces } from './surfaces.js';

describe('validateEditSurfaces', () => {
  const defaultProtectedPaths = [
    '.github/workflows/**',
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    '.env*',
  ];

  it('passes when changed files do not intersect protected paths', () => {
    const changedFiles = ['src/components/button.tsx', 'src/utils/math.ts'];
    const result = validateEditSurfaces({
      changedFiles,
      protectedPatterns: defaultProtectedPaths,
    });

    expect(result.isValid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('fails when a protected workflow file is modified', () => {
    const changedFiles = ['src/index.ts', '.github/workflows/deploy.yml'];
    const result = validateEditSurfaces({
      changedFiles,
      protectedPatterns: defaultProtectedPaths,
    });

    expect(result.isValid).toBe(false);
    expect(result.violations).toEqual(['.github/workflows/deploy.yml']);
  });

  it('fails when lockfile or env is modified', () => {
    const changedFiles = ['package-lock.json', '.env.production', 'src/main.ts'];
    const result = validateEditSurfaces({
      changedFiles,
      protectedPatterns: defaultProtectedPaths,
    });

    expect(result.isValid).toBe(false);
    expect(result.violations).toEqual(['package-lock.json', '.env.production']);
  });

  it('enforces allowed edit surfaces when specified', () => {
    const changedFiles = ['src/backend/api.ts', 'src/frontend/app.tsx'];
    const result = validateEditSurfaces({
      changedFiles,
      allowedPatterns: ['src/backend/**'],
    });

    expect(result.isValid).toBe(false);
    expect(result.violations).toEqual(['src/frontend/app.tsx']);
  });

  it('passes when all files fall within allowed edit surfaces', () => {
    const changedFiles = ['src/backend/api.ts', 'src/backend/db.ts'];
    const result = validateEditSurfaces({
      changedFiles,
      allowedPatterns: ['src/backend/**'],
    });

    expect(result.isValid).toBe(true);
    expect(result.violations).toEqual([]);
  });
});
