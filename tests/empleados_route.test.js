const request = require('supertest');

// Mock database and other dependencies
jest.mock('../database/config', () => {
  return jest.fn().mockImplementation(() => ({
    db: { get: jest.fn(), all: jest.fn() },
    connect: jest.fn(() => Promise.resolve()),
    getUser: jest.fn(),
    logAccess: jest.fn(),
  }));
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

jest.mock('../database/duckdb', () => ({
  connection: {
    createInventoryTables: jest.fn(),
    listTables: jest.fn(() => Promise.resolve([])),
    getTablePreview: jest.fn(() => Promise.resolve({ columns: [], rows: [] })),
  },
  initializeDuckDB: jest.fn(),
}));

process.env.SESSION_SECRET = 'test';

const app = require('../server');
// Provide default session so requireAuth passes
app.request.session = { user: { id: 'test', rol: 'admin' } };

describe('Empleado interface route', () => {
  test('GET /empleados returns the empleados page', async () => {
    const res = await request(app).get('/empleados');
    expect(res.status).toBe(200);
  });
});
