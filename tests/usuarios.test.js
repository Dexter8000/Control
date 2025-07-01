const request = require('supertest');
const bcrypt = require('bcryptjs');

const mockDbGet = jest.fn((q, p, cb) => cb(null, null));
let insertedPassword;
const mockDbRun = jest.fn(function(q, params, cb){
  insertedPassword = params[1];
  cb.call({ lastID: 1 }, null);
});
const mockBeginTransaction = jest.fn(() => Promise.resolve());
const mockCommitTransaction = jest.fn(() => Promise.resolve());
const mockRollbackTransaction = jest.fn(() => Promise.resolve());
const mockLogAccess = jest.fn(() => Promise.resolve());

jest.mock('../database/config', () => {
  return jest.fn().mockImplementation(() => ({
    db: { get: mockDbGet, run: mockDbRun, all: jest.fn() },
    connect: jest.fn(() => Promise.resolve()),
    beginTransaction: mockBeginTransaction,
    commitTransaction: mockCommitTransaction,
    rollbackTransaction: mockRollbackTransaction,
    getUser: jest.fn(),
    logAccess: mockLogAccess,
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

const app = require('../server');
app.request.session = { user: { id: 'admin', rol: 'administrador' } };

describe('User creation', () => {
  beforeEach(() => {
    insertedPassword = undefined;
    jest.clearAllMocks();
  });

  test('password is hashed before saving', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .send({ usuario: 'newuser', password: 'secret', rol: 'administrador' });

    expect(res.status).toBe(200);
    expect(mockBeginTransaction).toHaveBeenCalled();
    expect(mockCommitTransaction).toHaveBeenCalled();
    expect(insertedPassword).toBeDefined();
    expect(insertedPassword).not.toBe('secret');
    expect(insertedPassword.startsWith('$2')).toBe(true);
    const match = await bcrypt.compare('secret', insertedPassword);
    expect(match).toBe(true);
  });
});
