/**
 * `npm run install:all`: installs the dependencies of the repository root (tooling), the API
 * (server/) and the web app (client/).
 *
 * Each install runs *inside* its folder instead of as `npm --prefix <folder> install`. On Windows
 * the --prefix form can install the root project into the sub-project (it adds
 * "financeflow": "file:.." to that package.json) and then skips the sub-project's postinstall
 * step, which is the step that generates the Prisma client.
 */
import { spawnSync } from 'node:child_process';

const projects = [
  { folder: '.', label: 'root (tooling)' },
  { folder: 'server', label: 'server (API)' },
  { folder: 'client', label: 'client (web app)' },
];

for (const { folder, label } of projects) {
  console.log(`\n> npm install: ${label}`);
  // A single command string with shell: true, so Windows resolves npm to npm.cmd.
  const result = spawnSync('npm install', { cwd: folder, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\nnpm install failed in ${label}.`);
    process.exit(result.status ?? 1);
  }
}
