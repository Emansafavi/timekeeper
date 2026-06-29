import { describe, expect, it } from 'vitest';
import { secondsBetween, timerElapsedSeconds } from '../src/lib/server/time';

describe('time calculations', () => {
  it('calculates positive durations in seconds', () => {
    expect(secondsBetween('2026-06-29T08:00:00.000Z', '2026-06-29T09:15:30.000Z')).toBe(4530);
  });

  it('rejects negative or zero durations', () => {
    expect(() => secondsBetween('2026-06-29T09:00:00.000Z', '2026-06-29T09:00:00.000Z')).toThrow();
    expect(() => secondsBetween('2026-06-29T10:00:00.000Z', '2026-06-29T09:00:00.000Z')).toThrow();
  });

  it('keeps paused timers from accumulating extra time', () => {
    expect(
      timerElapsedSeconds({
        status: 'paused',
        started_at: '2026-06-29T09:00:00.000Z',
        paused_at: '2026-06-29T09:30:00.000Z',
        accumulated_seconds: 1800
      })
    ).toBe(1800);
  });
});
