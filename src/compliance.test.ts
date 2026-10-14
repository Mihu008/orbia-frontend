import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Compliance check verifying CR-01 / Decision D-009 for the frontend repo.
 * Never use "Daftari Group" or "Pooja Construction" anywhere in the project.
 */
describe('Frontend Compliance & Naming Guard: CR-01 / Decision D-009', () => {
  function scanDirectory(dir: string, fileList: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'compliance.test.ts') {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDirectory(fullPath, fileList);
      } else if (/\.(ts|tsx|js|jsx|json|html|css)$/.test(entry.name)) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  it('verifies that prohibited entity names do not exist in frontend source code', () => {
    const files = scanDirectory(path.resolve(__dirname, '..'));
    const prohibitedPatterns = [/Daftari\s*Group/i, /Pooja\s*Construction/i];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const pattern of prohibitedPatterns) {
        const matches = content.match(pattern);
        expect(matches, `Prohibited name pattern ${pattern} found in ${file}`).toBeNull();
      }
    }
  });
});
