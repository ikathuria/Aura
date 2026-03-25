import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const functionsDir = path.join(repoRoot, 'supabase', 'functions');

if (!fs.existsSync(functionsDir)) {
  console.error('supabase/functions not found.');
  process.exit(1);
}

const functionDirs = fs
  .readdirSync(functionsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
  .map((entry) => entry.name);

const failures = [];
for (const fnName of functionDirs) {
  const entryFile = path.join(functionsDir, fnName, 'index.ts');
  if (!fs.existsSync(entryFile)) {
    failures.push(`${fnName}: missing index.ts`);
    continue;
  }

  const source = fs.readFileSync(entryFile, 'utf8');
  const hasRequireUserImport = source.includes('requireUser');
  const hasRequireUserCall = source.includes('await requireUser(req)');
  const hasNoVerifyJwtFlag = source.includes('--no-verify-jwt');

  if (!hasRequireUserImport || !hasRequireUserCall) {
    failures.push(`${fnName}: missing explicit requireUser auth check`);
  }
  if (hasNoVerifyJwtFlag) {
    failures.push(`${fnName}: contains no-verify-jwt flag text`);
  }
}

if (failures.length > 0) {
  console.error('Supabase function auth check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Supabase function auth check passed (${functionDirs.length} functions).`);
