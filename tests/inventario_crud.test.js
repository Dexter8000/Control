const request = require('supertest');

// Mocks for database module
const mockCreateEquipoPrincipal = jest.fn(() => Promise.resolve({ id: 'eq1' }));
const mockUpdateEquipoPrincipal = jest.fn(() => Promise.resolve({ changes: 1 }));
const mockDeleteEquipoPrincipal = jest.fn(() => Promise.resolve({ changes: 1 }));
const mockCreatePeriferico = jest.fn(() => Promise.resolve({ id: 'per1' }));
const mockUpdatePeriferico = jest.fn(() => Promise.resolve({ changes: 1 }));
const mockDeletePeriferico = jest.fn(() => Promise.resolve({ changes: 1 }));
const mockBeginTransaction = jest.fn(() => Promise.resolve());
const mockCommitTransaction = jest.fn(() => Promise.resolve());
const mockRollbackTransaction = jest.fn(() => Promise.resolve());

jest.mock('../database/config', () => {
  return jest.fn().mockImplementation(() => ({
    db: { get: jest.fn(), all: jest.fn() },
    connect: jest.fn(() => Promise.resolve()),
    beginTransaction: mockBeginTransaction,
    commitTransaction: mockCommitTransaction,
    rollbackTransaction: mockRollbackTransaction,
    createEquipoPrincipal: mockCreateEquipoPrincipal,
    updateEquipoPrincipal: mockUpdateEquipoPrincipal,
    deleteEquipoPrincipal: mockDeleteEquipoPrincipal,
    createPeriferico: mockCreatePeriferico,
    updatePeriferico: mockUpdatePeriferico,
    deletePeriferico: mockDeletePeriferico,
    getInventarioPrincipal: jest.fn(() => Promise.resolve([])),
    getInventarioPeriferico: jest.fn(() => Promise.resolve([])),
    getInventarioCompleto: jest.fn(() => Promise.resolve([])),
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
app.request.session = { user: { id: 'test', rol: 'admin' } };

describe('Inventario CRUD endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/inventario-principal creates item', async () => {
    const res = await request(app)
      .post('/api/inventario-principal')
      .send({ nombre: 'pc' });
    expect(res.status).toBe(201);
    expect(mockCreateEquipoPrincipal).toHaveBeenCalled();
    expect(res.body).toEqual({
      success: true,
      message: 'Equipo principal creado',
      equipoId: 'eq1',
    });
  });

  test('PUT /api/inventario-principal/:id updates item', async () => {
    const res = await request(app)
      .put('/api/inventario-principal/abc')
      .send({ nombre: 'upd' });
    expect(res.status).toBe(200);
    expect(mockUpdateEquipoPrincipal).toHaveBeenCalledWith('abc', {
      nombre: 'upd',
    });
    expect(res.body).toEqual({ success: true, message: 'Equipo principal actualizado' });
  });

  test('DELETE /api/inventario-principal/:id deletes item', async () => {
    const res = await request(app).delete('/api/inventario-principal/abc');
    expect(res.status).toBe(200);
    expect(mockDeleteEquipoPrincipal).toHaveBeenCalledWith('abc');
    expect(res.body).toEqual({ success: true, message: 'Equipo principal eliminado' });
  });

  test('POST /api/inventario-periferico creates item', async () => {
    const res = await request(app)
      .post('/api/inventario-periferico')
      .send({ nombre: 'per' });
    expect(res.status).toBe(201);
    expect(mockCreatePeriferico).toHaveBeenCalled();
    expect(res.body).toEqual({
      success: true,
      message: 'Periférico creado',
      perifericoId: 'per1',
    });
  });

  test('PUT /api/inventario-periferico/:id updates item', async () => {
    const res = await request(app)
      .put('/api/inventario-periferico/xyz')
      .send({ nombre: 'per' });
    expect(res.status).toBe(200);
    expect(mockUpdatePeriferico).toHaveBeenCalledWith('xyz', { nombre: 'per' });
    expect(res.body).toEqual({ success: true, message: 'Periférico actualizado' });
  });

  test('DELETE /api/inventario-periferico/:id deletes item', async () => {
    const res = await request(app).delete('/api/inventario-periferico/xyz');
    expect(res.status).toBe(200);
    expect(mockDeletePeriferico).toHaveBeenCalledWith('xyz');
    expect(res.body).toEqual({ success: true, message: 'Periférico eliminado' });
  });
});
