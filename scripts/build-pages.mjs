import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const srcApi = path.join(rootDir, 'src', 'app', 'api');
const backupApi = path.join(rootDir, 'src', 'api_backup');
const dataStore = path.join(rootDir, 'data', 'feed_store.json');
const publicData = path.join(rootDir, 'public', 'data');
const outDir = path.join(rootDir, 'out');

console.log('🚀 Preparing GitHub Pages static build...');

// 1. Copy feed store to public directory
if (!fs.existsSync(publicData)) {
  fs.mkdirSync(publicData, { recursive: true });
}
if (fs.existsSync(dataStore)) {
  fs.copyFileSync(dataStore, path.join(publicData, 'feed_store.json'));
  console.log('✓ Copied feed_store.json to public/data/');
}

// 2. Temporarily move src/app/api to avoid Next.js static export errors
let movedApi = false;
if (fs.existsSync(srcApi)) {
  fs.renameSync(srcApi, backupApi);
  movedApi = true;
  console.log('✓ Stashed server API routes');
}

try {
  // 3. Clear previous builds
  if (fs.existsSync(path.join(rootDir, '.next'))) {
    fs.rmSync(path.join(rootDir, '.next'), { recursive: true, force: true });
  }
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }

  // 4. Run Next.js static export
  console.log('✓ Running Next.js static export (basePath: /AIfeed)...');
  execSync('npx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      GITHUB_PAGES: 'true',
    },
  });

  // 5. Create .nojekyll in out directory
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
  console.log('✓ Created out/.nojekyll');

  console.log('🎉 GitHub Pages build completed successfully in out/!');
} finally {
  // 6. Restore src/app/api
  if (movedApi && fs.existsSync(backupApi)) {
    fs.renameSync(backupApi, srcApi);
    console.log('✓ Restored server API routes');
  }
}
