import { describe, test, expect } from 'vitest';
import { resolveSocketHost } from '../actionTypes';

describe('resolveSocketHost (production-first backend selection)', () => {
  test('local host with PUBLIC_LOCAL_BACKEND unset resolves to pente.org', () => {
    expect(resolveSocketHost('localhost')).toBe('pente.org');
    expect(resolveSocketHost('machine.local')).toBe('pente.org');
  });

  test('local host with PUBLIC_LOCAL_BACKEND injected as anything but "1" still resolves to pente.org', () => {
    expect(resolveSocketHost('localhost', '0')).toBe('pente.org');
    expect(resolveSocketHost('localhost', 'true')).toBe('pente.org');
  });

  test('local host with PUBLIC_LOCAL_BACKEND injected as "1" resolves to localhost', () => {
    expect(resolveSocketHost('localhost', '1')).toBe('localhost');
    expect(resolveSocketHost('machine.local', '1')).toBe('localhost');
  });

  test('non-local hostnames pass through unchanged regardless of the flag', () => {
    expect(resolveSocketHost('pente.org')).toBe('pente.org');
    expect(resolveSocketHost('live.pente.org', '1')).toBe('live.pente.org');
    expect(resolveSocketHost('192.168.1.5')).toBe('192.168.1.5');
  });
});
