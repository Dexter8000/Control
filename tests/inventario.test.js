const request = require('supertest');

// Setup mocks for database methods we want to track
const mockCreateEquipoPrincipal = jest.fn(() => Promise.resolve({ id: 'ep1' }));
const mockUpdateEquipoPrincipal = jest.fn(() => Promise.resolve({ changes: 1 }));
const mockDeleteEquipoPrincipal = jest.fn(() => Promise.resolve({ changes: 1 }));
const mockCreatePeriferico = jest.fn(() => Promise.resolve({ id: 'pf1' }));
const mockUpdatePeriferico = jest.fn(() => Promise.resolve({ changes: 1 }));
const mockDeletePeriferico = jest.fn(() => Promise.resolve({ changes: 1 }));

jest.mock('../database/config', () => {
  return jest.fn().mockImplementation(() => ({
    db: { get: jest.fn(), all: jest.fn() },
    connect: jest.fn(() => Promise.resolve()),
    createEquipoPrincipal: mockCreateEquipoPrincipal,
    updateEquipoPrincipal: mockUpdateEquipoPrincipal,
    deleteEquipoPrincipal: mockDeleteEquipoPrincipal,
    createPeriferico: mockCreatePeriferico,
    updatePeriferico: mockUpdatePeriferico,
    deletePeriferico: mockDeletePeriferico,
    beginTransaction: jest.fn(() => Promise.resolve()),
    commitTransaction: jest.fn(() => Promise.resolve()),
    rollbackTransaction: jest.fn(() => Promise.resolve()),
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
app.request.session = { user: { id: 'tester', rol: 'admin' } };

describe('Inventario principal y periférico endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/inventario-principal', async () => {
    const body = { nombre: 'PC1' };
    const res = await request(app).post('/api/inventario-principal').send(body);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      message: 'Equipo principal creado',
      equipoId: 'ep1',
    });
    expect(mockCreateEquipoPrincipal).toHaveBeenCalledWith(body);
  });

  test('PUT /api/inventario-principal/:id', async () => {
    const body = { nombre: 'Actualizado' };
    const res = await request(app)
      .put('/api/inventario-principal/id123')
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Equipo principal actualizado' });
    expect(mockUpdateEquipoPrincipal).toHaveBeenCalledWith('id123', body);
  });

  test('DELETE /api/inventario-principal/:id', async () => {
    const res = await request(app).delete('/api/inventario-principal/id123');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Equipo principal eliminado' });
    expect(mockDeleteEquipoPrincipal).toHaveBeenCalledWith('id123');
  });

  test('POST /api/inventario-periferico', async () => {
    const body = { nombre: 'Mouse' };
    const res = await request(app).post('/api/inventario-periferico').send(body);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      message: 'Periférico creado',
      perifericoId: 'pf1',
    });
    expect(mockCreatePeriferico).toHaveBeenCalledWith(body);
  });

  test('PUT /api/inventario-periferico/:id', async () => {
    const body = { nombre: 'Teclado' };
    const res = await request(app)
      .put('/api/inventario-periferico/idXYZ')
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Periférico actualizado' });
    expect(mockUpdatePeriferico).toHaveBeenCalledWith('idXYZ', body);
  });

  test('DELETE /api/inventario-periferico/:id', async () => {
    const res = await request(app).delete('/api/inventario-periferico/idXYZ');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Periférico eliminado' });
    expect(mockDeletePeriferico).toHaveBeenCalledWith('idXYZ');
  });
});

