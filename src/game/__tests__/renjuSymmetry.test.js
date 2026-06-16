import { describe, test, expect } from 'vitest';
import { d4Images, isSymmetricDup } from '../renjuSymmetry';

describe('renju D4 symmetry (15x15, center (7,7))', () => {
  test('the 8 images of an off-axis point are distinct and include the point', () => {
    const imgs = d4Images(40); // (10,2): dx=3, dy=-5
    expect(new Set(imgs).size).toBe(8);
    expect(imgs).toContain(40);
  });
  test('a center-symmetric counterpart is rejected against an accepted offer', () => {
    // 40 = (10,2) dx=3,dy=-5 ; its 180-degree image (-3,5) = (4,12) = 4 + 12*15 = 184
    expect(isSymmetricDup(184, [40])).toBe(true);
  });
  test('a non-symmetric point is accepted', () => {
    expect(isSymmetricDup(56, [40])).toBe(false); // (11,3) is not in the orbit of (10,2)
  });
  test('on-diagonal points have fewer than 8 distinct images but still self-consistent', () => {
    const imgs = d4Images(112 + 16); // (8,8) on main diagonal: dx=dy=1
    expect(imgs).toContain(112 + 16);
    expect(isSymmetricDup(112 + 16, [112 + 16])).toBe(true);
  });
});
