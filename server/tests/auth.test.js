import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { purgeExpiredDemoUsers } from '../src/modules/auth/auth.service.js';
import { createApp } from '../src/app.js';
import { api, prisma, registerUser, useCleanDatabase } from './helpers.js';
import request from 'supertest';

useCleanDatabase();

const newUser = {
  name: 'Asha Verma',
  email: 'asha@example.com',
  password: 'SecurePass1',
};

describe('POST /api/auth/register', () => {
  it('creates an account and returns a token plus the public user', async () => {
    const res = await api().post('/api/auth/register').send(newUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      id: expect.any(String),
      name: 'Asha Verma',
      email: 'asha@example.com',
      isDemo: false,
    });
    // The password (or its hash) must never be sent back
    expect(res.body.user).not.toHaveProperty('password');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    await api().post('/api/auth/register').send(newUser);
    const stored = await prisma.user.findUnique({ where: { email: newUser.email } });

    expect(stored.passwordHash).not.toBe(newUser.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it('normalises the email (trim + lowercase)', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ ...newUser, email: '  Asha@Example.COM ' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('asha@example.com');
  });

  it('rejects a duplicate email, regardless of case', async () => {
    await api().post('/api/auth/register').send(newUser);
    const res = await api()
      .post('/api/auth/register')
      .send({ ...newUser, email: 'ASHA@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it.each([
    ['missing name', { name: '' }, 'name'],
    ['invalid email', { email: 'not-an-email' }, 'email'],
    ['short password', { password: 'Ab1' }, 'password'],
    ['password without a number', { password: 'OnlyLetters' }, 'password'],
    ['password without a letter', { password: '12345678' }, 'password'],
    ['password over 72 bytes', { password: `A1${'x'.repeat(80)}` }, 'password'],
  ])('rejects %s with 400', async (_label, override, field) => {
    const res = await api()
      .post('/api/auth/register')
      .send({ ...newUser, ...override });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field)).toContain(field);
  });

  it('rejects a malformed JSON body', async () => {
    const res = await api()
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name": ');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await registerUser(newUser);
    const res = await api()
      .post('/api/auth/login')
      .send({ email: ' ASHA@example.com', password: newUser.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('asha@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects a wrong password with 401', async () => {
    await registerUser(newUser);
    const res = await api()
      .post('/api/auth/login')
      .send({ email: newUser.email, password: 'WrongPass1' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('gives an unknown email the exact same response (no account enumeration)', async () => {
    await registerUser(newUser);
    const wrongPassword = await api()
      .post('/api/auth/login')
      .send({ email: newUser.email, password: 'WrongPass1' });
    const unknownEmail = await api()
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'WrongPass1' });

    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('validates the request body', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'asha@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('password');
  });
});

describe('GET /api/auth/me (protected route)', () => {
  it('returns the logged-in user for a valid token', async () => {
    const { auth, user } = await registerUser();
    const res = await api().get('/api/auth/me').set(auth);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(user);
  });

  it('rejects a request without a token', async () => {
    const res = await api().get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NO_TOKEN');
  });

  it('rejects a malformed Authorization header', async () => {
    const { token } = await registerUser();
    const res = await api().get('/api/auth/me').set('Authorization', `Token ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NO_TOKEN');
  });

  it('rejects a tampered token', async () => {
    const { token } = await registerUser();
    const tampered = `${token.slice(0, -4)}abcd`;
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${tampered}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects a token signed with a different secret', async () => {
    const { user } = await registerUser();
    const forged = jwt.sign({}, 'some-other-secret-that-is-long-enough!!', {
      subject: user.id,
      issuer: 'financeflow-api',
      audience: 'financeflow-client',
    });
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${forged}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects an unsigned ("alg: none") token', async () => {
    const { user } = await registerUser();
    const unsigned = jwt.sign({ sub: user.id }, null, { algorithm: 'none' });
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${unsigned}`);

    expect(res.status).toBe(401);
  });

  it('rejects an expired token with TOKEN_EXPIRED', async () => {
    const { user } = await registerUser();
    const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET, {
      subject: user.id,
      issuer: 'financeflow-api',
      audience: 'financeflow-client',
    });
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects a valid token once the account has been deleted', async () => {
    const { auth, user } = await registerUser();
    await prisma.user.delete({ where: { id: user.id } });
    const res = await api().get('/api/auth/me').set(auth);

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/demo', () => {
  it('creates an isolated demo user with sample data', async () => {
    const res = await api().post('/api/auth/demo');

    expect(res.status).toBe(201);
    expect(res.body.user.isDemo).toBe(true);

    const auth = { Authorization: `Bearer ${res.body.token}` };
    const list = await api().get('/api/transactions').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.pagination.total).toBeGreaterThan(50);
  });

  it('gives every visitor their own sandbox', async () => {
    const first = await api().post('/api/auth/demo');
    const second = await api().post('/api/auth/demo');

    expect(first.body.user.id).not.toBe(second.body.user.id);
  });

  it('purges demo users older than 24 hours, including their data', async () => {
    const res = await api().post('/api/auth/demo');
    const demoId = res.body.user.id;
    await prisma.user.update({
      where: { id: demoId },
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });

    const deleted = await purgeExpiredDemoUsers();

    expect(deleted).toBe(1);
    expect(await prisma.transaction.count({ where: { userId: demoId } })).toBe(0);
  });
});

describe('rate limiting', () => {
  it('blocks repeated failed logins with 429', async () => {
    const limitedApp = createApp({ rateLimitEnabled: true });
    const attempt = () =>
      request(limitedApp)
        .post('/api/auth/login')
        .send({ email: 'attacker@example.com', password: 'Guess1234' });

    for (let i = 0; i < 10; i += 1) {
      expect((await attempt()).status).toBe(401);
    }
    const blocked = await attempt();

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});
