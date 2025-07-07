const request = require('supertest');

// Prepare mocks for database module
const mockDbGet = jest.fn();
const mockDbAll = jest.fn();
const mockDbGetAsync = jest.fn(() => Promise.resolve(null));
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
const mockGetInventarioGeneralActivos = jest.fn(() =>
  Promise.resolve([{ id: 'ip1', perifericos: [] }])
);

jest.mock('../database/config', () => {
  return jest.fn().mockImplementation(() => ({
    db: { get: mockDbGet, all: mockDbAll },
    get: mockDbGetAsync,
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
    getInventarioGeneralActivos: mockGetInventarioGeneralActivos,
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



process.env.SESSION_SECRET = 'test';

const app = require('../server');
// Bypass authentication middleware by providing a default session
app.request.session = { user: { id: 'test', rol: 'admin' } };

describe('Departamento CRUD API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDbGet.mockImplementation((q, p, cb) => cb(null, null));
    mockDbGetAsync.mockResolvedValue(null);
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

  test('GET /api/departamentos/:id returns department', async () => {
    mockDbGetAsync.mockResolvedValueOnce({ id: 'dep1', nombre: 'Soporte' });
    const res = await request(app).get('/api/departamentos/dep1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      departamento: { id: 'dep1', nombre: 'Soporte' },
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
    app.request.session = { user: { id: 'test', rol: 'admin' } };
    jest.clearAllMocks();
  });

  test('GET /api/inventario_general_activos returns inventory', async () => {
    const res = await request(app).get('/api/inventario_general_activos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, inventario: [{ id: 'ip1', perifericos: [] }] });
  });
});

describe('Modal inventory endpoints', () => {
  beforeEach(() => {
    app.request.session = { user: { id: 'test', rol: 'admin' } };
    jest.clearAllMocks();
  });

  test('GET /api/inventario_general_activos returns inventory', async () => {
    const res = await request(app).get('/api/inventario_general_activos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, inventario: [{ id: 'ip1', perifericos: [] }] });
  });
});
