import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, sanitize } from './settings'

describe('sanitize', () => {
  it('不正なデータは既定値', () => {
    expect(sanitize(null)).toEqual(DEFAULT_SETTINGS)
    expect(sanitize('x')).toEqual(DEFAULT_SETTINGS)
    expect(sanitize({})).toEqual(DEFAULT_SETTINGS)
  })

  it('保存した値を復元する', () => {
    const saved = {
      ...DEFAULT_SETTINGS,
      text: '| Am | G |',
      bpm: 150,
      variantId: 'jazz-swing',
      beatsPerBar: 3,
      fills: { 3: 'toms' },
      range: { start: 1, end: 3 },
      autoFill: 8,
      mixer: { ...DEFAULT_SETTINGS.mixer, bass: { mute: true, solo: false, volume: 0.3 } },
    }
    expect(sanitize(JSON.parse(JSON.stringify(saved)))).toEqual(saved)
  })

  it('範囲外の値は丸め、未知のバリエーション・フィルは捨てる', () => {
    const s = sanitize({ bpm: 999, transpose: 99, variantId: 'nope', fills: { 1: 'xxx', 2: 'break', a: 'toms' }, range: { start: 3, end: 2 } })
    expect(s.bpm).toBe(240)
    expect(s.transpose).toBe(6)
    expect(s.variantId).toBe(DEFAULT_SETTINGS.variantId)
    expect(s.fills).toEqual({ 2: 'break' })
    expect(s.range).toBeNull()
  })
})
