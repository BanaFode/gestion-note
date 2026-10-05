import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedClientOrigin } from './clientOrigin.js';

test('allows the configured client origin in any environment', () => {
   assert.equal(
      isAllowedClientOrigin('https://school.example', 'https://school.example', 'production'),
      true
   );
});

test('allows Vite localhost fallback ports in development', () => {
   assert.equal(
      isAllowedClientOrigin('http://localhost:5175', 'http://localhost:5173'),
      true
   );
   assert.equal(
      isAllowedClientOrigin('http://127.0.0.1:5199', 'http://localhost:5173'),
      true
   );
});

test('rejects unconfigured origins outside local Vite ports', () => {
   assert.equal(
      isAllowedClientOrigin('http://localhost:5200', 'http://localhost:5173'),
      false
   );
   assert.equal(
      isAllowedClientOrigin('https://localhost:5175', 'http://localhost:5173'),
      false
   );
   assert.equal(
      isAllowedClientOrigin('https://attacker.example', 'http://localhost:5173', 'production'),
      false
   );
});
