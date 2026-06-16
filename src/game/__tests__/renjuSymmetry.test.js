import { describe, test, expect } from 'vitest';
import { renjuRotate, renjuStabilizer, isSymmetricDup } from '../renjuSymmetry';

// valueAt built from a {moveIndex: stoneValue} map (0 = empty elsewhere).
const board = (occ) => (m) => occ[m] || 0;

describe('renju symmetry — mirrors server isSymmetricDuplicate / JSP renjuStabilizer', () => {
  test('renjuRotate: centre is fixed; r=4 is the 180° rotation', () => {
    expect(renjuRotate(112, 0)).toBe(112); // identity, centre
    expect(renjuRotate(112, 4)).toBe(112); // centre fixed under every op
    // 40 = (10,2): dx=3,dy=-5 ; 180° -> (4,12) = 4 + 12*15 = 184
    expect(renjuRotate(40, 4)).toBe(184);
    expect(renjuRotate(184, 4)).toBe(40); // involution
  });

  test('an asymmetric placed position has only the identity stabilizer', () => {
    // centre (black) + a stone off EVERY axis and diagonal ((9,8)=129) breaks all symmetry
    const valueAt = board({ 112: 2, 129: 1 });
    expect(renjuStabilizer(valueAt)).toEqual([0]);
  });

  test('asymmetric position: only an EXACT duplicate offer is a dup (rotations are legal)', () => {
    const valueAt = board({ 112: 2, 129: 1 });
    // 184 is the 180° image of 40, but the position is asymmetric -> NOT a dup
    expect(isSymmetricDup(184, [40], valueAt)).toBe(false);
    // the exact same point IS a dup
    expect(isSymmetricDup(40, [40], valueAt)).toBe(true);
  });

  test('a symmetric placed position (lone centre) rejects rotated offers', () => {
    const valueAt = board({ 112: 2 }); // only the centre -> full D4 stabilizer
    expect(renjuStabilizer(valueAt).length).toBe(8);
    expect(isSymmetricDup(184, [40], valueAt)).toBe(true); // 184 is a rotation-image of 40
    expect(isSymmetricDup(56, [40], valueAt)).toBe(false); // 56 is not in 40's orbit
  });
});
