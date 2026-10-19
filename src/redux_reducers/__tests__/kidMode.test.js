import { describe, test, expect } from 'vitest';
import liveGameApp from '../rootReducer';

const init = () => liveGameApp(undefined, { type: '@@INIT' });
const dispatch = (state, type, payload) => liveGameApp(state, { type, payload });
const login = (me) => dispatch(init(), 'dsgLoginEvent', {
  player: 'kid_one', me: { admin: false, subscriberLevel: 0, ...me }, serverData: { tournament: false, arena: false },
});

describe('kid flag from dsgLoginEvent', () => {
  test('initial state is not a kid', () => {
    expect(init().isKid).toBe(false);
  });
  test('login with me.parentPid sets isKid', () => {
    expect(login({ parentPid: 23000000012345 }).isKid).toBe(true);
  });
  test('login without parentPid leaves isKid false', () => {
    expect(login({}).isKid).toBe(false);
  });
  test('own player-data refreshes after login (no parentPid on the wire) keep isKid', () => {
    let s = login({ parentPid: 23000000012345 });
    s = dispatch(s, 'dsgJoinMainRoomEvent', { dsgPlayerData: { name: 'kid_one', subscriberLevel: 0, gameData: [] } });
    s = dispatch(s, 'dsgUpdatePlayerDataEvent', { data: { name: 'kid_one', subscriberLevel: 0, gameData: [] } });
    expect(s.isKid).toBe(true);
  });
  test('socket close resets isKid', () => {
    expect(dispatch(login({ parentPid: 1 }), 'REDUX_WEBSOCKET::CLOSED').isKid).toBe(false);
  });
  test('dsgLoginErrorEvent resets isKid', () => {
    expect(dispatch(login({ parentPid: 1 }), 'dsgLoginErrorEvent', {}).isKid).toBe(false);
  });
});

describe('server-stripped invite text', () => {
  // keep the 'game server' user: invitationReply posts its notice as that user
  const withBob = () => { const s = init(); return { ...s, me: 'kid_one', users: { ...s.users, bob: { muted: false } } }; };

  test('omitted inviteText becomes an empty message', () => {
    const s = dispatch(withBob(), 'dsgInviteTableEvent', { player: 'bob', toInvite: 'kid_one', table: 3 });
    expect(s.received_invitation).toEqual({ by: 'bob', message: '', table: 3 });
  });
  test('empty inviteText stays empty', () => {
    const s = dispatch(withBob(), 'dsgInviteTableEvent', { player: 'bob', toInvite: 'kid_one', inviteText: '', table: 3 });
    expect(s.received_invitation.message).toBe('');
  });
  test('empty responseText adds no "Their message" line', () => {
    const s = dispatch(withBob(), 'dsgInviteResponseTableEvent', { player: 'bob', toPlayer: 'kid_one', accept: false, responseText: '', table: 3 });
    expect(s.room_messages.at(-1).message).toBe('bob declined your invitation.');
  });
});
