/**
 * First step of `npm run setup`: checks the Node.js version and creates the API's
 * environment files from the examples (with a freshly generated JWT secret).
 * Existing files are never overwritten.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 22)) {
  console.error(
    `\nFinanceFlow needs Node.js 22.22 or newer, but this computer has ${process.version}.\n` +
      'Install the LTS version from https://nodejs.org, reopen the terminal and run "npm run setup" again.\n',
  );
  process.exit(1);
}

function createFromExample(target, example, transform = (text) => text) {
  if (existsSync(target)) {
    console.log(`✓ ${target} already exists (left unchanged)`);
    return;
  }
  writeFileSync(target, transform(readFileSync(example, 'utf8')));
  console.log(`✓ Created ${target}`);
}

createFromExample('server/.env', 'server/.env.example', (text) =>
  text.replace(
    'replace-me-with-a-long-random-secret-at-least-32-chars',
    randomBytes(48).toString('hex'),
  ),
);
createFromExample('server/.env.test', 'server/.env.test.example');
console.log(`✓ Node.js ${process.version}\n`);
