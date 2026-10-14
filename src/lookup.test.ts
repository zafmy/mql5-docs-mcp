import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codes, explainCode, functions, getFunction, MAX_RESULTS, search } from './lookup.js';

test('index is populated', () => {
  assert.ok(functions.length > 400, `only ${functions.length} functions`);
  assert.ok(codes.length > 200, `only ${codes.length} codes`);
  assert.ok(functions.every((f) => f.url.startsWith('https://www.mql5.com/en/docs/')));
});

test('get_signature returns the real MQL5 signature', () => {
  const f = getFunction('copybuffer()');
  assert.equal(f?.name, 'CopyBuffer');
  assert.ok(f!.signatures.some((s) => s.startsWith('int CopyBuffer(int indicator_handle')));
  assert.equal(getFunction('OrderSendReliable'), undefined); // MQL4-era helper, not MQL5
});

test('search ranks exact, then prefix, and caps results', () => {
  assert.equal(search('OrderSend')[0].name, 'OrderSend');
  assert.equal(search('a', 50).length, MAX_RESULTS);
  assert.deepEqual(search('   '), []);
});

test('search ignores spaces and underscores in function names', () => {
  assert.equal(search('copy buffer')[0]?.name, 'CopyBuffer');
  assert.equal(search('order_send')[0]?.name, 'OrderSend');
  assert.ok(search('trade functions').length > 0); // section match still uses the spaced query
});

test('explain_code handles numbers, strings and constants', () => {
  assert.equal(explainCode(10016)[0].constant, 'TRADE_RETCODE_INVALID_STOPS');
  assert.equal(explainCode('4014')[0].constant, 'ERR_FUNCTION_NOT_ALLOWED');
  assert.equal(explainCode('trade_retcode_done')[0].code, 10009);
  assert.deepEqual(explainCode(1), []);
});

test('get_signature tolerates spaces, underscores and call syntax', () => {
  assert.equal(getFunction('OrderSend (request, result)')?.name, 'OrderSend');
  assert.equal(getFunction('copy_buffer')?.name, 'CopyBuffer');
  assert.equal(getFunction('CopyBuffer(\n  handle, 0, 0, 1, buf)')?.name, 'CopyBuffer');
});
