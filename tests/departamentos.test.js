const request = require('supertest');

// Prepare mocks for database module
const mockDbGet = jest.fn();
const mockDbAll = jest.fn();
const mockGetDepartamentos = jest.fn(() =>
  Promise.resolve([{ id: '1', nombre: 'TI' }])
);
const mockCreateDepartamento = jest.fn(() => Promise.resolve({ id: 'new-id' }));
const mockUpdateDepartamento = jest.fn(() => Promise.resolve({ changes: 1 }));
const mockDeleteDepartamento = jest.fn(() => Promise.resolve({ changes: 1 }));
const mockBeginTransaction = jest.fn(() => Promise.resolve());
const mockCommitTransaction = jest.fn(() => Promise.resolve());
const mockRollbackTransaction = jest.fn(() => Promise.resolve());
const mockGetInventarioPrincipal = jest.fn(() =>
  Promise.resolve([{ id: 'p1' }])
);
const mockGetInventarioPeriferico = jest.fn(() =>
  Promise.resolve([{ id_periferico: 'pf1' }])
);
const mockGetInventarioCompleto = jest.fn(() =>
  Promise.resolve([{ id: 'ip1', perifericos: [] }])
);

jest.mock('../database/config', () => {
  return jest.fn().mockImplementation(() => ({
    db: { get: mockDbGet, all: mockDbAll },
    connect: jest.fn(() => Promise.resolve()),
    beginTransaction: mockBeginTransaction,
    commitTransaction: mockCommitTransaction,
    rollbackTransaction: mockRollbackTransaction,
    createDepartamento: mockCreateDepartamento,
    updateDepartamento: mockUpdateDepartamento,
    deleteDepartamento: mockDeleteDepartamento,
    getDepartamentos: mockGetDepartamentos,
    getInventarioPrincipal: mockGetInventarioPrincipal,
    getInventarioPeriferico: mockGetInventarioPeriferico,
    getInventarioCompleto: mockGetInventarioCompleto,
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
    crearVacaciones: jest.fn(),
    calcularInfoVacaciones: jest.fn(),
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
// Bypass authentication middleware by providing a default session
app.request.session = { user: { id: 'test', rol: 'admin' } };

describe('Departamento CRUD API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDbGet.mockImplementation((q, p, cb) => cb(null, null));
  });

  test('GET /api/departamentos returns department list', async () => {
    const res = await request(app).get('/api/departamentos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      departamentos: [{ id: '1', nombre: 'TI' }],
    });
  });

  test('POST /api/departamentos creates department', async () => {
    const res = await request(app)
      .post('/api/departamentos')
      .send({ nombre: 'TI' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      message: 'Departamento creado',
      departamentoId: 'new-id',
    });
  });

  test('PUT /api/departamentos/:id updates department', async () => {
    const res = await request(app)
      .put('/api/departamentos/dep1')
      .send({ nombre: 'Soporte' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Departamento actualizado',
    });
  });

  test('DELETE /api/departamentos/:id removes department', async () => {
    const res = await request(app).delete('/api/departamentos/dep1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Departamento eliminado',
    });
  });
});

describe('Panel control inventario endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/inventario-principal returns inventory list', async () => {
    const res = await request(app).get('/api/inventario-principal');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, inventario: [{ id: 'p1' }] });
  });

  test('GET /api/inventario-periferico returns inventory list', async () => {
    const res = await request(app).get('/api/inventario-periferico');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      inventario: [{ id_periferico: 'pf1' }],
    });
  });
});

describe('Modal inventory endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/inventario-principal returns inventory list', async () => {
    const res = await request(app).get('/api/inventario-principal');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, inventario: [{ id: 'p1' }] });
  });

  test('GET /api/inventario-periferico returns inventory list', async () => {
    const res = await request(app).get('/api/inventario-periferico');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      inventario: [{ id_periferico: 'pf1' }],
    });
  });

  test('regression: /api/inventario-periferico responds with sample data', async () => {
    const res = await request(app).get('/api/inventario-periferico');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.inventario)).toBe(true);
  });

  test('GET /api/inventario-completo returns joined inventory', async () => {
    const res = await request(app).get('/api/inventario-completo');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      inventario: [{ id: 'ip1', perifericos: [] }],
    });
  });
});
