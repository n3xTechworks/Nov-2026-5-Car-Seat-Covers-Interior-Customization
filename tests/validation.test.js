// Unit tests for js/validation.js. Run: node --test tests/validation.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../js/validation.js');

const ok = (fn, val, ...rest) => assert.equal(fn(val, ...rest), '', `${JSON.stringify(val)} should be valid`);
const bad = (fn, val, ...rest) => assert.notEqual(fn(val, ...rest), '', `${JSON.stringify(val)} should be invalid`);

test('name: accepts real names', () => {
  ['Mary Evans', 'Jo', "Seán O'Neill", 'Anne-Marie Dubois', 'Dr. Priya Nair', 'José Álvarez', 'Zoë'].forEach(n => ok(v.validateName, n));
});
test('name: rejects single characters, digits and symbols', () => {
  ['A', 'a', 'A.', 'John3', '3', 'Mary 2nd', 'R2D2', 'mary@home', 'Bob!', '  ', '', '-Jo', "'Al"].forEach(n => bad(v.validateName, n));
});
test('name: rejects over-long names', () => { bad(v.validateName, 'A'.repeat(81)); });

test('email: accepts standard formats', () => {
  ['mary@example.com', 'mary.evans@example.co.uk', 'm+care@hexstitch.in', 'a_b-c@mail-server.org'].forEach(e => ok(v.validateEmail, e));
});
test('email: rejects missing @, missing domain and malformed addresses', () => {
  ['mary.example.com', 'mary@', '@example.com', 'mary@example', 'mary@example.', 'mary@.com', 'ma ry@example.com',
    'mary@@example.com', '.mary@example.com', 'mary.@example.com', 'ma..ry@example.com', 'mary@exa_mple.com', 'mary@example.c', ''].forEach(e => bad(v.validateEmail, e));
});

test('phone: accepts 10-digit Indian mobiles (spaces allowed)', () => {
  ['9876543210', '98765 43210', '6000000000', '7012345678', '8899001122'].forEach(p => ok(v.validatePhone, p));
});
test('phone: rejects letters, symbols, wrong lengths and bad first digit', () => {
  ['98765abc', 'abcdefghij', '98765-43210', '+919876543210', '(987) 6543210', '987654321', '98765432101', '1234567890', '0987654321', '5876543210', ''].forEach(p => bad(v.validatePhone, p));
});
test('pin: 6 digits, not starting with 0', () => {
  ['641004', '560001'].forEach(p => ok(v.validatePin, p));
  ['64100', '6410045', '041004', '64a004', ''].forEach(p => bad(v.validatePin, p));
});

test('date: today and future dates are valid, past dates are not', () => {
  const today = new Date(2026, 10, 4); // 4 Nov 2026
  ok(v.validateFutureDate, '2026-11-04', today);
  ok(v.validateFutureDate, '2026-11-05', today);
  ok(v.validateFutureDate, '2027-01-01', today);
  bad(v.validateFutureDate, '2026-11-03', today);
  bad(v.validateFutureDate, '2025-12-31', today);
});
test('date: rejects malformed and impossible dates', () => {
  const today = new Date(2026, 10, 4);
  ['', '04/11/2026', '2026-13-01', '2026-02-30', '2026-11-4', 'tomorrow'].forEach(d => bad(v.validateFutureDate, d, today));
});

test('password: at least 8 characters with a letter and a number', () => {
  ['abcd1234', 'Hexstitch2027', 'correct horse 9'].forEach(x => ok(v.validatePassword, x));
  ['', 'short1', 'abcdefgh', '12345678', 'a1'.repeat(70)].forEach(x => bad(v.validatePassword, x));
});
test('validateField: password rule via name and data-match confirm', () => {
  assert.notEqual(v.validateField(field({ name: 'new-password', type: 'password', value: 'abc' })), '');
  assert.equal(v.validateField(field({ name: 'new-password', type: 'password', value: 'abcd1234' })), '');
  assert.equal(v.validateField(field({ name: 'password', type: 'password', value: 'x', required: true })), '', 'login password only needs to be present');
  const other = { value: 'abcd1234' };
  const confirm = field({ name: 'confirm', type: 'password', value: 'abcd9999', form: { querySelector: () => other }, attrs: { 'data-match': '#pw' } });
  assert.notEqual(v.validateField(confirm), '');
  confirm.value = 'abcd1234';
  assert.equal(v.validateField(confirm), '');
});

test('required: empty or whitespace is an error', () => {
  bad(v.validateRequired, ''); bad(v.validateRequired, '   '); bad(v.validateRequired, null);
  ok(v.validateRequired, 'x');
});

// validateField works with plain objects shaped like form controls
function field(o) { return Object.assign({ name: '', type: 'text', value: '', required: false, tagName: 'INPUT', getAttribute: (k) => (o.attrs || {})[k] || null }, o); }
test('validateField: infers the rule from name/type', () => {
  assert.notEqual(v.validateField(field({ name: 'name', value: 'J' })), '');
  assert.equal(v.validateField(field({ name: 'name', value: 'Jo' })), '');
  assert.notEqual(v.validateField(field({ name: 'email', type: 'email', value: 'mary@' })), '');
  assert.notEqual(v.validateField(field({ name: 'phone', type: 'tel', value: '98765abc' })), '');
  assert.equal(v.validateField(field({ name: 'phone', type: 'tel', value: '9876543210' })), '');
  assert.notEqual(v.validateField(field({ name: 'visit', type: 'date', value: '2000-01-01' })), '');
  assert.notEqual(v.validateField(field({ name: 'mobile', type: 'text', value: '98765' })), '');
  assert.notEqual(v.validateField(field({ name: 'pin', value: '6410' })), '');
  assert.equal(v.validateField(field({ name: 'pin', value: '641004' })), '');
});
test('validateField: required vs optional, checkboxes, selects and data-rule', () => {
  assert.equal(v.validateField(field({ name: 'message', value: '' })), '');
  assert.notEqual(v.validateField(field({ name: 'message', value: '', required: true })), '');
  assert.equal(v.validateField(field({ name: 'phone', type: 'tel', value: '' })), '', 'optional empty phone is fine');
  assert.notEqual(v.validateField(field({ name: 'consent', type: 'checkbox', checked: false, required: true })), '');
  assert.equal(v.validateField(field({ name: 'consent', type: 'checkbox', checked: true, required: true })), '');
  assert.notEqual(v.validateField(field({ name: 'room', tagName: 'SELECT', type: 'select-one', value: '', required: true })), '');
  assert.notEqual(v.validateField(field({ name: 'relative', value: 'Ann3', attrs: { 'data-rule': 'name' } })), '');
});
