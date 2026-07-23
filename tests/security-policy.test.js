// Ejemplo de prueba unitaria para los módulos de _shared/security.js y
// _shared/file-security.js. Copia el patrón, no necesariamente este archivo
// literal — ajusta a los roles y reglas reales de la app.
//
// Ejecuta con: node --test tests/*.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actorHasRole, actorIsActive, timingSafeEqualText, emailIsValid } from '../base44/functions/_shared/security.js';
import { isPrivateAddress, validateAllowedLocation } from '../base44/functions/_shared/file-security.js';

test('cuentas desactivadas nunca se consideran activas, sin importar el rol', () => {
  assert.equal(actorIsActive({ id: '1', role: 'admin', disabled: true }), false);
  assert.equal(actorIsActive({ id: '1', role: 'admin', disabled: false }), true);
  assert.equal(actorIsActive(null), false);
});

test('actorHasRole rechaza roles fuera de la lista permitida', () => {
  assert.equal(actorHasRole({ id: '1', role: 'guest' }, ['admin', 'organization_admin', 'teacher']), false);
  assert.equal(actorHasRole({ id: '1', role: 'teacher' }, ['admin', 'organization_admin', 'teacher']), true);
});

test('timingSafeEqualText compara longitudes distintas sin filtrar por early-exit', () => {
  assert.equal(timingSafeEqualText('firma-corta', 'firma-mucho-mas-larga'), false);
  assert.equal(timingSafeEqualText('misma-firma', 'misma-firma'), true);
});

test('emailIsValid rechaza inyección de cabeceras (CRLF)', () => {
  assert.equal(emailIsValid('bueno@example.com'), true);
  assert.equal(emailIsValid('malo@example.com\r\nBcc: victima@example.com'), false);
});

test('isPrivateAddress bloquea rangos privados y el endpoint de metadata en la nube', () => {
  assert.equal(isPrivateAddress('127.0.0.1'), true);
  assert.equal(isPrivateAddress('169.254.169.254'), true);
  assert.equal(isPrivateAddress('10.0.0.5'), true);
  assert.equal(isPrivateAddress('storage.googleapis.com'), false);
});

test('validateAllowedLocation exige origen exacto, no coincidencia parcial de dominio', () => {
  const allowlist = 'https://storage.googleapis.com/mi-bucket-real/';
  assert.equal(validateAllowedLocation('https://storage.googleapis.com.evil.com/x', allowlist).ok, false);
  assert.equal(validateAllowedLocation('https://storage.googleapis.com/otro-bucket/x', allowlist).ok, false);
  assert.equal(validateAllowedLocation('https://storage.googleapis.com/mi-bucket-real/archivo.pdf', allowlist).ok, true);
});

test('validateAllowedLocation falla cerrado si la allowlist no está configurada', () => {
  assert.equal(validateAllowedLocation('https://cualquier-cosa.com/x', '').ok, false);
  assert.equal(validateAllowedLocation('https://cualquier-cosa.com/x', undefined).ok, false);
});
