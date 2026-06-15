import { describe, test, expect } from 'vitest';
import { selectCurrentTable, isGuestName, tableVisibleToGuest } from '../index';

describe('selectCurrentTable — the current-table reach, in one place', () => {
  test('returns the table object keyed by the current table id', () => {
    const t = { table: 5, rated: true };
    expect(selectCurrentTable({ table: 5, tables: { 5: t } })).toBe(t);
  });

  test('returns undefined when not seated at a table (faithful to state.tables[undefined])', () => {
    expect(selectCurrentTable({ table: undefined, tables: {} })).toBeUndefined();
  });

  test('returns undefined when the id has no matching table', () => {
    expect(selectCurrentTable({ table: 9, tables: { 5: {} } })).toBeUndefined();
  });
});

describe('isGuestName — the guest-detection rule, case-insensitive prefix', () => {
  test('a name starting with "guest" is a guest, any case', () => {
    expect(isGuestName('guest123')).toBe(true);
    expect(isGuestName('Guest_42')).toBe(true);
    expect(isGuestName('GUEST')).toBe(true);
  });

  test('a registered name is not a guest', () => {
    expect(isGuestName('alice')).toBe(false);
    expect(isGuestName('iostest')).toBe(false);
  });

  test('"guest" must be a prefix, not anywhere', () => {
    expect(isGuestName('myguest')).toBe(false);
  });

  test('missing/empty name is not a guest (no crash)', () => {
    expect(isGuestName(undefined)).toBe(false);
    expect(isGuestName('')).toBe(false);
  });

  test('does not trim — startsWith runs against the raw name', () => {
    expect(isGuestName(' guest')).toBe(false); // leading space → not a prefix match
    expect(isGuestName('guest ')).toBe(true); // trailing space still starts with "guest"
  });
});

describe('tableVisibleToGuest — guests must not see rated tables', () => {
  test('a registered viewer sees every table', () => {
    expect(tableVisibleToGuest({ rated: true }, false)).toBe(true);
    expect(tableVisibleToGuest({ rated: false }, false)).toBe(true);
  });

  test('a guest sees unrated tables but not rated ones', () => {
    expect(tableVisibleToGuest({ rated: false }, true)).toBe(true);
    expect(tableVisibleToGuest({ rated: true }, true)).toBe(false);
  });

  test('rated is read by JS truthiness — only a truthy rated is hidden from guests', () => {
    expect(tableVisibleToGuest({}, true)).toBe(true); // no rated field → visible
    expect(tableVisibleToGuest({ rated: 0 }, true)).toBe(true); // falsy → visible
    expect(tableVisibleToGuest({ rated: 1 }, true)).toBe(false); // truthy → hidden
  });
});
