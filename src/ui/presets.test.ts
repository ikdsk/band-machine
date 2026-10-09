import { describe, expect, it } from 'vitest'
import { parseProgression } from '../music/progression'
import { ALL_VARIANTS } from '../styles'
import { PRESETS } from './presets'

describe('PRESETS', () => {
  it.each(PRESETS.map((p) => [p.name, p] as const))('%s は既存パーサでエラーなく読める', (_name, p) => {
    expect(parseProgression(p.text).errors).toEqual([])
  })

  it('推奨バリエーションは実在し、テンポは範囲内', () => {
    for (const p of PRESETS) {
      if (p.variantId) expect(ALL_VARIANTS.some((v) => v.id === p.variantId)).toBe(true)
      if (p.bpm !== undefined) expect(p.bpm >= 40 && p.bpm <= 240).toBe(true)
    }
  })

  it('既存プリセットは進行だけを変える', () => {
    for (const p of PRESETS.slice(0, 7)) expect(p.variantId ?? p.bpm ?? p.transpose).toBeUndefined()
  })

  it('残酷な天使のテーゼ（サビ）: 10 小節・アニソン疾走系・BPM 128・移調 ±0', () => {
    const p = PRESETS.find((x) => x.name === '残酷な天使のテーゼ（サビ）')!
    const chart = parseProgression(p.text)
    expect(chart.bars).toHaveLength(10)
    expect(chart.bars[9].entries.map((e) => [e.label, e.beats])).toEqual([
      ['Bb', 1],
      ['Gm', 1],
      ['Bb', 1],
      ['Cm', 1],
    ])
    expect(p).toMatchObject({ variantId: 'anime-fast', bpm: 128, transpose: 0 })
  })

  it('残酷な天使のテーゼ（Aメロ〜Bメロ）: 13 小節', () => {
    const p = PRESETS.find((x) => x.name === '残酷な天使のテーゼ（Aメロ〜Bメロ）')!
    const chart = parseProgression(p.text)
    expect(chart.bars).toHaveLength(13)
    expect(chart.bars[12].entries.map((e) => e.label)).toEqual(['Dm7b5', 'G'])
  })
})
