import { describe, test, expect } from 'vitest';
import {
  MODALS,
  OPEN_MODAL,
  CLOSE_MODAL,
  TOGGLE_MODAL,
  openModal,
  closeModal,
  toggleModal,
  modalsReducer,
  isModalOpen,
  modalProps,
} from '../modals';

describe('modal seam — action creators', () => {
  test('openModal(name) is a plain OPEN_MODAL action with no props', () => {
    expect(openModal(MODALS.SETTINGS)).toEqual({
      type: OPEN_MODAL,
      name: 'settings',
      props: undefined,
    });
  });

  test('openModal(name, props) carries the payload', () => {
    expect(openModal(MODALS.BOOT, 'alice')).toEqual({
      type: OPEN_MODAL,
      name: 'boot',
      props: 'alice',
    });
  });

  test('closeModal(name) is a plain CLOSE_MODAL action', () => {
    expect(closeModal(MODALS.SETTINGS)).toEqual({ type: CLOSE_MODAL, name: 'settings' });
  });

  test('toggleModal(name, props) is a plain TOGGLE_MODAL action', () => {
    expect(toggleModal(MODALS.CREATE_ARENA)).toEqual({
      type: TOGGLE_MODAL,
      name: 'createArena',
      props: undefined,
    });
  });
});

describe('modal seam — pure reducer', () => {
  test('OPEN_MODAL with no props opens the modal (boolean true)', () => {
    const next = modalsReducer({}, openModal(MODALS.SETTINGS));
    expect(next.settings).toBe(true);
  });

  test('OPEN_MODAL with props stores the payload', () => {
    const next = modalsReducer({}, openModal(MODALS.BOOT, 'alice'));
    expect(next.boot).toBe('alice');
  });

  test('CLOSE_MODAL removes the key entirely (single closed encoding, like the old delete)', () => {
    expect(modalsReducer({ settings: true }, closeModal(MODALS.SETTINGS))).toEqual({});
  });

  test('CLOSE_MODAL clears a carried payload back to an empty map (boot dismiss)', () => {
    expect(modalsReducer({ boot: 'alice' }, closeModal(MODALS.BOOT))).toEqual({});
  });

  test('closing an already-closed modal is a no-op (same reference, no false tombstone)', () => {
    const input = { settings: true };
    expect(modalsReducer(input, closeModal(MODALS.BOOT))).toBe(input);
  });

  test('TOGGLE_MODAL on an open modal closes it and drops any props', () => {
    expect(modalsReducer({ boot: 'alice' }, toggleModal(MODALS.BOOT, 'ignored'))).toEqual({});
  });

  test('open is payload-agnostic — a falsy payload still opens, carrying that value', () => {
    // openModal is the only opener and closeModal (key removal) the only closer; nothing is
    // inferred from payload truthiness (unlike the old SHOW_BOOT_DIALOG `if (payload)` guard).
    const zero = modalsReducer({}, openModal(MODALS.BOOT, 0));
    expect(isModalOpen({ modals: zero }, MODALS.BOOT)).toBe(true);
    expect(modalProps({ modals: zero }, MODALS.BOOT)).toBe(0);
    expect(modalProps({ modals: modalsReducer({}, openModal(MODALS.BOOT, '')) }, MODALS.BOOT)).toBe('');
  });

  test('reducer is pure on close — clone-and-delete does not mutate input', () => {
    const input = { settings: true, boot: 'x' };
    modalsReducer(input, closeModal(MODALS.BOOT));
    expect(input).toEqual({ settings: true, boot: 'x' });
  });

  test('TOGGLE_MODAL opens when closed and closes when open', () => {
    const opened = modalsReducer({}, toggleModal(MODALS.SETTINGS));
    expect(isModalOpen({ modals: opened }, MODALS.SETTINGS)).toBe(true);
    const closed = modalsReducer(opened, toggleModal(MODALS.SETTINGS));
    expect(isModalOpen({ modals: closed }, MODALS.SETTINGS)).toBe(false);
  });

  test('TOGGLE_MODAL with props opens carrying the payload', () => {
    const next = modalsReducer({}, toggleModal(MODALS.BOOT, 'bob'));
    expect(modalProps({ modals: next }, MODALS.BOOT)).toBe('bob');
  });

  test('modals are independent — opening one does not disturb another', () => {
    let s = modalsReducer({}, openModal(MODALS.SETTINGS));
    s = modalsReducer(s, openModal(MODALS.BOOT, 'carol'));
    expect(isModalOpen({ modals: s }, MODALS.SETTINGS)).toBe(true);
    expect(modalProps({ modals: s }, MODALS.BOOT)).toBe('carol');
    s = modalsReducer(s, closeModal(MODALS.SETTINGS));
    expect(isModalOpen({ modals: s }, MODALS.SETTINGS)).toBe(false);
    expect(modalProps({ modals: s }, MODALS.BOOT)).toBe('carol'); // boot untouched
  });

  test('reducer is pure — input state is not mutated', () => {
    const input = { settings: true };
    modalsReducer(input, openModal(MODALS.BOOT, 'x'));
    expect(input).toEqual({ settings: true });
  });

  test('unknown action returns the same modals reference', () => {
    const input = { settings: true };
    expect(modalsReducer(input, { type: 'SOMETHING_ELSE' })).toBe(input);
  });

  test('defaults to an empty modals map', () => {
    expect(modalsReducer(undefined, { type: 'NOOP' })).toEqual({});
  });
});

describe('modal seam — selectors', () => {
  test('isModalOpen is false for an absent modal', () => {
    expect(isModalOpen({ modals: {} }, MODALS.SETTINGS)).toBe(false);
  });

  test('isModalOpen is true for a payload-carrying open modal (boot)', () => {
    expect(isModalOpen({ modals: { boot: 'alice' } }, MODALS.BOOT)).toBe(true);
  });

  test('modalProps returns the carried value when open', () => {
    expect(modalProps({ modals: { boot: 'alice' } }, MODALS.BOOT)).toBe('alice');
  });

  test('modalProps returns undefined for a boolean-open modal (no payload)', () => {
    expect(modalProps({ modals: { settings: true } }, MODALS.SETTINGS)).toBeUndefined();
  });

  test('a closed modal is an absent key — modalProps undefined preserves the `!== undefined` open gate', () => {
    expect(modalProps({ modals: {} }, MODALS.BOOT)).toBeUndefined();
    expect(isModalOpen({ modals: {} }, MODALS.BOOT)).toBe(false);
  });

  test('selectors tolerate a missing modals slice', () => {
    expect(isModalOpen({}, MODALS.SETTINGS)).toBe(false);
    expect(modalProps({}, MODALS.BOOT)).toBeUndefined();
  });
});
