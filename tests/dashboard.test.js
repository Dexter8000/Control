const request = require('supertest');

// Mock database and prestamos modules before requiring the app
jest.mock('../database/config', () => {
  return jest.fn().mockImplementation(() => {
    return {
      db: {
        get: jest.fn((query, params, cb) => cb(null, { total: 3 })),
        all: jest.fn(),
      },
      connect: jest.fn(() => Promise.resolve()),
      getUser: jest.fn(),
      logAccess: jest.fn(),
    };
  });
});

jest.mock('../database/prestamos', () => {
  return jest.fn().mockImplementation(() => ({
    conectar: jest.fn(() => Promise.resolve()),
  }));
});

jest.mock('../database/vacaciones', () => {
  return jest.fn().mockImplementation(() => ({
    actualizarEstadosVacaciones: jest.fn(),
  }));
});

const app = require('../server');

describe('Dashboard API', () => {
  test('GET /api/dashboard/total-empleados returns mocked total', async () => {
    const res = await request(app).get('/api/dashboard/total-empleados');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 3 });
  });
});
