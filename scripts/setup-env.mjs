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
    console.log(`✓ ${target} already exists`);
    return;
  }
  writeFileSync(target, transform(readFileSync(example, 'utf8')));
  console.log(`✓ Created ${target}`);
}

/** The host port docker-compose.yml publishes PostgreSQL on (e.g. "5433:5432" -> "5433"). */
function composeDatabasePort() {
  const match = /['"]?(\d+):5432['"]?/.exec(readFileSync('docker-compose.yml', 'utf8'));
  return match ? match[1] : null;
}

/** If DATABASE_URL points at the Docker database, make sure it uses the port Docker publishes. */
function syncDockerPort(file) {
  const port = composeDatabasePort();
  if (!port || !existsSync(file)) return;
  const text = readFileSync(file, 'utf8');
  const updated = text.replace(
    /(DATABASE_URL="postgresql:\/\/postgres:postgres@localhost:)(\d+)(\/financeflow")/,
    (line, start, current, end) => (current === port ? line : `${start}${port}${end}`),
  );
  if (updated !== text) {
    writeFileSync(file, updated);
    console.log(`✓ ${file}: database port set to ${port} (matches docker-compose.yml)`);
  }
}

createFromExample('server/.env', 'server/.env.example', (text) =>
  text.replace(
    'replace-me-with-a-long-random-secret-at-least-32-chars',
    randomBytes(48).toString('hex'),
  ),
);
syncDockerPort('server/.env');
console.log(`✓ Node.js ${process.version}\n`);
