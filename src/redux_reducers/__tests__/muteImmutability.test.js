import { describe, test, expect } from 'vitest';
import { mute, unmute } from '../utils';
import User from '../../Classes/UserClass';

function makeUser(name) {
  const u = new User();
  u.name = name;
  return u;
}

describe('mute/unmute update state.users immutably (clone, never mutate the prior object)', () => {
  test('mute does not mutate the previous user object', () => {
    const user = makeUser('bob');
    const state = { users: { bob: user } };
    mute('bob', state);
    expect(user.muted).toBeUndefined(); // original snapshot untouched
    expect(state.users.bob.muted).toBe(true); // the new clone is muted
    expect(state.users.bob).not.toBe(user); // different reference
  });

  test('unmute does not mutate the previous user object', () => {
    const user = makeUser('bob');
    user.muted = true;
    const state = { users: { bob: user } };
    unmute('bob', state);
    expect(user.muted).toBe(true); // original snapshot still muted
    expect(state.users.bob.muted).toBeUndefined(); // the new clone is unmuted
    expect(state.users.bob).not.toBe(user);
  });

  test('mute swaps in a new users map, preserves other entries, and keeps the clone\'s fields', () => {
    const bob = makeUser('bob');
    const ann = makeUser('ann');
    const prevMap = { bob, ann };
    const state = { users: prevMap };
    mute('bob', state);
    expect(state.users).not.toBe(prevMap); // new map reference (so connected components re-render)
    expect(state.users.ann).toBe(ann); // untouched users keep their identity
    expect(state.users.bob.name).toBe('bob'); // clone preserves other fields, not just muted
  });
});
