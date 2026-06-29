import { describe, expect, it } from 'vitest';
import {
  addDays,
  localDateKey,
  secondsBetween,
  startOfLocalDay,
  startOfLocalMonth,
  startOfLocalWeek,
  timerElapsedSeconds
} from '../src/lib/server/time';

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

  it('calculates day, week, and month boundaries in the configured timezone', () => {
    const date = new Date('2026-06-29T22:30:00.000Z');

    expect(localDateKey(date, 'Europe/Berlin')).toBe('2026-06-30');
    expect(startOfLocalDay(date, 'Europe/Berlin').toISOString()).toBe('2026-06-29T22:00:00.000Z');
    expect(startOfLocalWeek(date, 'Europe/Berlin').toISOString()).toBe('2026-06-28T22:00:00.000Z');
    expect(startOfLocalMonth(date, 'Europe/Berlin').toISOString()).toBe('2026-05-31T22:00:00.000Z');
  });

  it('advances local days across daylight saving changes', () => {
    const dstStart = startOfLocalDay(new Date('2026-03-29T12:00:00.000Z'), 'Europe/Berlin');
    const nextDay = addDays(dstStart, 1, 'Europe/Berlin');

    expect(dstStart.toISOString()).toBe('2026-03-28T23:00:00.000Z');
    expect(nextDay.toISOString()).toBe('2026-03-29T22:00:00.000Z');
  });
});
