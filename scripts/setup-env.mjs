/**
 * First step of `npm run setup`: checks the Node.js version and creates server/.env from
 * server/.env.example with a freshly generated JWT secret. An existing file is never
 * overwritten. (Tests need no env file: their defaults match docker-compose.yml.)
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

// 22.18 is the first Node.js release that runs TypeScript files (the generated Prisma client)
// without flags. 24 LTS is recommended.
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 18)) {
  console.error(
    `\nFinanceFlow needs Node.js 22.18 or newer, but this computer has ${process.version}.\n` +
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
console.log(`✓ Node.js ${process.version}\n`);
