import fs from 'node:fs';
import path from 'node:path';

/**
 * CI Import-Ban Gate (`ADR-008` Section 2.2):
 * Scans `src/`, `server.ts`, and `scripts/` to verify that zero application files import
 * `firebase/firestore`, `@firebase/firestore`, or `firebase-admin/firestore`.
 * Only `scripts/migrate-firestore-to-appwrite.ts` (and this checker script) are exempt.
 */

const BANNED_SPECIFIERS = [
  'firebase/firestore',
  '@firebase/firestore',
  'firebase-admin/firestore',
];

const EXEMPT_RELATIVE_PATHS = new Set([
  'scripts/migrate-firestore-to-appwrite.ts',
  'scripts/check-no-firestore-imports.ts',
]);

function collectTsFiles(dirPath: string, rootDir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return acc;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectTsFiles(full, rootDir, acc);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      acc.push(path.relative(rootDir, full).replace(/\\/g, '/'));
    }
  }
  return acc;
}

export function checkNoFirestoreImports(rootDir = process.cwd()): {
  passed: boolean;
  scannedCount: number;
  violations: { file: string; specifier: string }[];
} {
  const filesToScan = [
    'server.ts',
    ...collectTsFiles(path.join(rootDir, 'src'), rootDir),
    ...collectTsFiles(path.join(rootDir, 'scripts'), rootDir),
  ];

  const violations: { file: string; specifier: string }[] = [];

  for (const relFile of filesToScan) {
    if (EXEMPT_RELATIVE_PATHS.has(relFile)) continue;
    const absPath = path.join(rootDir, relFile);
    if (!fs.existsSync(absPath)) continue;
    const content = fs.readFileSync(absPath, 'utf8');

    for (const spec of BANNED_SPECIFIERS) {
      const importRegex = new RegExp(`(?:from\\s+|import\\s*\\(?\\s*)['"]${spec}(?:['"/])`);
      if (importRegex.test(content)) {
        violations.push({ file: relFile, specifier: spec });
      }
    }
  }

  return {
    passed: violations.length === 0,
    scannedCount: filesToScan.length,
    violations,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = checkNoFirestoreImports();
  if (!result.passed) {
    console.error('[FAIL] Banned Firestore imports detected in application code:', result.violations);
    process.exit(1);
  }
  console.log(
    `[PASS] (No-Firestore Import Gate) Scanned ${result.scannedCount} files in src/, server.ts, and scripts/ — 0 firebase/firestore imports found.`
  );
}
