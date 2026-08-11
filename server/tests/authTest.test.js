const request = require('supertest');
const app = require('../index');
const db = require('../db');

describe('Authentication API & Middleware Tests', () => {
  const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const password = 'TestPassword123';
  let token = '';

  afterAll(async () => {
    // Clean up test user
    try {
      await db.query('DELETE FROM users WHERE email = $1', [uniqueEmail]);
    } catch (e) {
      console.error('Failed to clean up test user:', e.message);
    }
    // Close database pool to allow Jest to exit cleanly
    await db.pool.end();
  });

  test('POST /api/auth/register - Should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: uniqueEmail, password });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(uniqueEmail);

    token = res.body.token;
  });

  test('POST /api/auth/register - Should reject duplicate email signup', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: uniqueEmail, password });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/auth/login - Should login successfully with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail, password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(uniqueEmail);
  });

  test('POST /api/auth/login - Should reject login with incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail, password: 'WrongPassword' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/items - Should reject request without token', async () => {
    const res = await request(app)
      .get('/api/items');

    expect(res.status).toBe(401);
  });

  test('GET /api/items - Should reject request with invalid token', async () => {
    const res = await request(app)
      .get('/api/items')
      .set('Authorization', 'Bearer invalid-token-string');

    expect(res.status).toBe(401);
  });

  test('GET /api/items - Should allow access with valid token', async () => {
    const res = await request(app)
      .get('/api/items')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
