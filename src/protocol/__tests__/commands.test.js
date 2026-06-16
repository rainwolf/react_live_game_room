import { describe, test, expect } from 'vitest';
import fixtures from '../__fixtures__/wire-fixtures.json';
import { Commands } from '../commands';
import { COMMANDS } from '../messages';

const outbound = Object.entries(fixtures.messages).filter(([, e]) => e.out);
const cmdByType = Object.fromEntries(
  Object.entries(COMMANDS).map(([cmd, c]) => [c.type, cmd])
);

describe('Commands — build the exact outbound payloads real components send', () => {
  test.each(outbound)('builds %s identically to the captured frame', (type, entry) => {
    const cmd = cmdByType[type];
    expect(cmd, `no command registered for ${type}`).toBeDefined();
    // builder auto-stamps time; pass every other captured field as args
    const { time, ...args } = entry.out;
    const built = Commands[cmd](args);
    expect(built).toEqual({ [type]: entry.out });
  });
});

describe('Commands — validation catches client bugs before they hit the wire', () => {
  test('throws when a required field is missing', () => {
    expect(() => Commands.move({ move: 180 })).toThrow(/missing required field/);
  });

  test('stamps time:0 by default', () => {
    expect(Commands.sit({ seat: 1, table: 1 })).toEqual({
      dsgSitTableEvent: { seat: 1, table: 1, time: 0 },
    });
  });

  test('login accepts the guest form (only guest is required)', () => {
    expect(Commands.login({ guest: true })).toEqual({
      dsgLoginEvent: { guest: true, time: 0 },
    });
  });

  test('every both/out message in the descriptors has a working command', () => {
    for (const [cmd, { type }] of Object.entries(COMMANDS)) {
      expect(typeof Commands[cmd], `${type} -> Commands.${cmd}`).toBe('function');
    }
  });
});

describe('renju outbound commands', () => {
  test('renjuSwap frame: type key + fields + auto time:0', () => {
    expect(Commands.renjuSwap({ swap: false, move: 113, player: 'alice', table: 5 }))
      .toEqual({ dsgRenjuTaraguchiSwapTableEvent: { swap: false, move: 113, player: 'alice', table: 5, time: 0 } });
  });
  test('renjuOffer10 frame', () => {
    expect(Commands.renjuOffer10({ moves: [40, 41], player: 'alice', table: 5 }))
      .toEqual({ dsgRenjuTaraguchiOffer10TableEvent: { moves: [40, 41], player: 'alice', table: 5, time: 0 } });
  });
  test('renjuSelect1 frame', () => {
    expect(Commands.renjuSelect1({ move: 57, player: 'bob', table: 5 }))
      .toEqual({ dsgRenjuTaraguchi10Select1TableEvent: { move: 57, player: 'bob', table: 5, time: 0 } });
  });
});
