const fs = require('fs');
const path = require('path');
const duckdb = require('@duckdb/node-api');
const { initializeDuckDB } = require('../database/duckdb');

const hasDatabaseCtor = typeof duckdb.Database === 'function';

(hasDatabaseCtor ? describe : describe.skip)('DuckDB initialization', () => {
  const tmpPath = path.join(__dirname, 'analytics_test.db');

  beforeAll(() => {
    process.env.DUCKDB_PATH = tmpPath;
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  });

  afterAll(() => {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    delete process.env.DUCKDB_PATH;
  });

  test('initializeDuckDB resolves without errors', async () => {
    const conn = await initializeDuckDB();
    expect(conn).toBeDefined();
    await new Promise((res) => conn.close(res));
  });
});
