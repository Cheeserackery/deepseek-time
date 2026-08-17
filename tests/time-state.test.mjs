import test from 'node:test'
import assert from 'node:assert/strict'
import { formatRemainingTime, getDeepSeekTimeState } from '../packages/core/src/time-state.mjs'

const atBeijing = (hour, minute = 0, second = 0, millisecond = 0) =>
  Date.UTC(2026, 7, 17, hour - 8, minute, second, millisecond)

test('remains idle before the morning peak and counts down to 09:00', () => {
  const state = getDeepSeekTimeState(atBeijing(8, 59, 59, 100))
  assert.equal(state.phase, 'idle')
  assert.equal(state.remainingText, '00:00:01')
})

test('switches to peak exactly at 09:00', () => {
  const state = getDeepSeekTimeState(atBeijing(9))
  assert.equal(state.phase, 'peak')
  assert.equal(state.remainingText, '03:00:00')
})

test('switches to idle exactly at 12:00', () => {
  const state = getDeepSeekTimeState(atBeijing(12))
  assert.equal(state.phase, 'idle')
  assert.equal(state.remainingText, '02:00:00')
})

test('switches to peak exactly at 14:00', () => {
  const state = getDeepSeekTimeState(atBeijing(14))
  assert.equal(state.phase, 'peak')
  assert.equal(state.remainingText, '04:00:00')
})

test('switches to overnight idle exactly at 18:00', () => {
  const state = getDeepSeekTimeState(atBeijing(18))
  assert.equal(state.phase, 'idle')
  assert.equal(state.remainingText, '15:00:00')
})

test('accepts Date inputs and preserves a partial final second', () => {
  const state = getDeepSeekTimeState(new Date(atBeijing(11, 59, 59, 1)))
  assert.equal(state.phase, 'peak')
  assert.equal(state.remainingText, '00:00:01')
})

test('rounds a remaining interval up to the next second', () => {
  assert.equal(formatRemainingTime(0), '00:00:00')
  assert.equal(formatRemainingTime(1), '00:00:01')
  assert.equal(formatRemainingTime(3_600_001), '01:00:01')
})
