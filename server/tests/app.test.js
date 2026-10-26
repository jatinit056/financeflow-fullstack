import { afterAll, describe, expect, it } from 'vitest';
import { api, prisma } from './helpers.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('app-level behaviour', () => {
  it('GET /api/health reports ok', async () => {
    const res = await api().get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await api().get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('sets security headers and hides the framework', async () => {
    const res = await api().get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows the configured frontend origin (CORS)', async () => {
    const res = await api()
      .options('/api/transactions')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('rejects other origins (CORS)', async () => {
    const res = await api().get('/api/health').set('Origin', 'https://evil.example');

    expect(res.status).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.body.error.code).toBe('CORS_REJECTED');
  });

  it('passes through client errors from the body parser (e.g. unknown encoding)', async () => {
    const res = await api()
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'made-up')
      .send('{}');

    expect(res.status).toBe(415);
    expect(res.body.error.message).toMatch(/unsupported content encoding/i);
  });

  it('rejects oversized request bodies', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'a@b.co', password: 'x'.repeat(20_000) });

    expect(res.status).toBe(413);
  });
});
