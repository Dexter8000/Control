const duckdb = require('@duckdb/node-api');
const util = require('util');

console.log('--- Inspección Profunda del Módulo DuckDB ---');
console.log(util.inspect(duckdb, { showHidden: false, depth: null, colors: false }));
console.log('------------------------------------------');
