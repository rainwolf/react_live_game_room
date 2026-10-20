import { describe, test, expect } from 'vitest';
import { isKidLogin, KID_CHAT_HINT, KIDS_PAGE_URL, KIDS_LINK_TEXT } from '../kidMode';

describe('isKidLogin — kid status from the login echo only', () => {
  test('a numeric parentPid means kid', () => {
    expect(isKidLogin({ parentPid: 23000000012345 })).toBe(true);
  });
  test('missing parentPid (normal account, or a server without the feature) is not a kid', () => {
    expect(isKidLogin({ admin: false })).toBe(false);
  });
  test('null parentPid is not a kid', () => {
    expect(isKidLogin({ parentPid: null })).toBe(false);
  });
  test('missing me is not a kid', () => {
    expect(isKidLogin(undefined)).toBe(false);
  });
  test('copy and link are the contract values', () => {
    expect(KID_CHAT_HINT).toBe('Only players your parent approved will see your messages.');
    expect(KIDS_PAGE_URL).toBe('https://www.pente.org/gameServer/myprofile/kids');
    expect(KIDS_LINK_TEXT).toBe('Kid accounts');
  });
});
