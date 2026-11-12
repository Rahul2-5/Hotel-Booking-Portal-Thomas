import assert from 'node:assert/strict';
import test from 'node:test';
import { getTodayDateString, nextDate } from './dates.js';

test('checkout minimum crosses month and year boundaries', () => {
  assert.equal(nextDate('2026-04-30'), '2026-05-01');
  assert.equal(nextDate('2026-12-31'), '2027-01-01');
});

test('checkout minimum respects leap years', () => {
  assert.equal(nextDate('2024-02-28'), '2024-02-29');
  assert.equal(nextDate('2024-02-29'), '2024-03-01');
  assert.equal(nextDate('2026-02-28'), '2026-03-01');
});

test('dates retain their calendar day in India', () => {
  const previousTimezone = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Kolkata';
    assert.equal(nextDate('2026-11-13'), '2026-11-14');
    assert.equal(nextDate(''), getTodayDateString());
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});
