import { describe, expect, it } from 'vitest';
import { CORE_VERSION, compareVersions } from './version';

describe('core/version', () => {
  it('exposes a semver-like version', () => {
    expect(CORE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('compares versions numerically', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    expect(compareVersions('1.2.3', '1.10.0')).toBe(-1);
    expect(compareVersions('2.0', '1.9.9')).toBe(1);
  });
});
