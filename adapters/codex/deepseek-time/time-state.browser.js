/** Time rules for DeepSeek's published Beijing-time peak pricing windows. */

const BEIJING_TIME_ZONE = 'Asia/Shanghai'
const IDLE_COLOR = '#4D6BFE'
const PEAK_COLOR = '#D92D20'

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

/**
 * Convert an instant into the Gregorian calendar fields used by Beijing's fixed UTC+8 offset.
 *
 * @param {number} epochMs Unix epoch milliseconds.
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number }}
 */
function beijingParts(epochMs) {
  const date = new Date(epochMs + BEIJING_OFFSET_MS)
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  }
}

/**
 * Return an epoch instant for a wall-clock time in Beijing.
 *
 * @param {{ year: number, month: number, day: number }} day Beijing calendar date.
 * @param {number} hour Beijing hour.
 * @returns {number} Unix epoch milliseconds.
 */
function atBeijingHour(day, hour) {
  return Date.UTC(day.year, day.month, day.day, hour) - BEIJING_OFFSET_MS
}

/**
 * Pad a non-negative integer to two display digits.
 *
 * @param {number} value Integer value.
 * @returns {string} Two-digit decimal string.
 */
function twoDigits(value) {
  return String(value).padStart(2, '0')
}

/**
 * Format an interval for the compact status widget.
 *
 * @param {number} durationMs Non-negative duration in milliseconds.
 * @returns {string} `HH:MM:SS` with seconds rounded up while time remains.
 */
function formatRemainingTime(durationMs) {
  const totalSeconds = Math.max(0, Math.ceil(durationMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`
}

/**
 * Determine the active DeepSeek pricing window at an instant.
 *
 * Peak windows are `[09:00, 12:00)` and `[14:00, 18:00)` in Beijing. Every
 * other instant is idle. The next boundary is exclusive, so an exact boundary
 * belongs to the interval that starts there.
 *
 * @param {number|Date} [instant=Date.now()] Unix milliseconds or Date instance.
 * @returns {{ phase: 'peak'|'idle', label: string, color: string, nextBoundary: number, remainingMs: number, remainingText: string }}
 */
function getDeepSeekTimeState(instant = Date.now()) {
  const epochMs = instant instanceof Date ? instant.getTime() : instant
  if (!Number.isFinite(epochMs)) throw new TypeError('instant must be a valid Date or Unix timestamp')

  const day = beijingParts(epochMs)
  const secondsSinceMidnight = day.hour * 3600 + day.minute * 60 + day.second
  const nine = 9 * 3600
  const noon = 12 * 3600
  const fourteen = 14 * 3600
  const eighteen = 18 * 3600

  let phase
  let nextBoundary
  if (secondsSinceMidnight >= nine && secondsSinceMidnight < noon) {
    phase = 'peak'
    nextBoundary = atBeijingHour(day, 12)
  } else if (secondsSinceMidnight >= fourteen && secondsSinceMidnight < eighteen) {
    phase = 'peak'
    nextBoundary = atBeijingHour(day, 18)
  } else if (secondsSinceMidnight >= noon && secondsSinceMidnight < fourteen) {
    phase = 'idle'
    nextBoundary = atBeijingHour(day, 14)
  } else {
    phase = 'idle'
    const tomorrow = new Date(Date.UTC(day.year, day.month, day.day + 1))
    const nextDay = { year: tomorrow.getUTCFullYear(), month: tomorrow.getUTCMonth(), day: tomorrow.getUTCDate() }
    nextBoundary = secondsSinceMidnight < nine ? atBeijingHour(day, 9) : atBeijingHour(nextDay, 9)
  }

  const remainingMs = Math.max(0, nextBoundary - epochMs)
  const isPeak = phase === 'peak'
  return {
    phase,
    label: isPeak ? '高峰时段' : '空闲时段',
    color: isPeak ? PEAK_COLOR : IDLE_COLOR,
    nextBoundary,
    remainingMs,
    remainingText: formatRemainingTime(remainingMs),
  }
}



globalThis.DeepSeekTime = { BEIJING_TIME_ZONE, IDLE_COLOR, PEAK_COLOR, formatRemainingTime, getDeepSeekTimeState }
