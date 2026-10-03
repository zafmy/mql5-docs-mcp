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

test('explain_code handles numbers, strings and constants', () => {
  assert.equal(explainCode(10016)[0].constant, 'TRADE_RETCODE_INVALID_STOPS');
  assert.equal(explainCode('4014')[0].constant, 'ERR_FUNCTION_NOT_ALLOWED');
  assert.equal(explainCode('trade_retcode_done')[0].code, 10009);
  assert.deepEqual(explainCode(1), []);
});
