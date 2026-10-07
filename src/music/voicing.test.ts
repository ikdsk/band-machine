import { describe, expect, it } from 'vitest'
import { type Chord, parseChord } from './chords'
import {
  BASS_RANGE,
  GUITAR_RANGE,
  KEYS_RANGE,
  bassRoot,
  guitarVoicing,
  keysLowRoot,
  keysVoicing,
  nearestVoicing,
  powerChord,
  voicingPcs,
} from './voicing'

function chord(text: string): Chord {
  const r = parseChord(text)
  if (!r.ok) throw new Error(r.error)
  return r.value
}
const pc = (n: number) => ((n % 12) + 12) % 12
const ALL = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim', 'C7', 'Fmaj7', 'G7b9', 'Bbm7', 'F#m7b5', 'Ebadd9', 'A9', 'Dsus4', 'Gaug', 'C13', 'E7#9']

describe('voicingPcs', () => {
  it('声部数を超えたら5度から省く', () => {
    expect(voicingPcs(chord('C9'), 4)).toEqual([0, 4, 10, 2])
    expect(voicingPcs(chord('C'), 4)).toEqual([0, 4, 7])
  })
})

describe('guitarVoicing', () => {
  it('音域内に収まり、構成音のみで、昇順', () => {
    for (const sym of ALL) {
      const v = guitarVoicing(chord(sym))
      const pcs = chord(sym).pcs.map(pc)
      expect(Math.min(...v), sym).toBeGreaterThanOrEqual(GUITAR_RANGE[0])
      expect(Math.max(...v), sym).toBeLessThanOrEqual(GUITAR_RANGE[1])
      for (const n of v) expect(pcs, sym).toContain(pc(n))
      expect([...v].sort((a, b) => a - b)).toEqual(v)
    }
  })

  it('コードチェンジで近い転回形を選ぶ（総移動量が小さい）', () => {
    const c = guitarVoicing(chord('C'))
    const g = guitarVoicing(chord('G'), c)
    const am = guitarVoicing(chord('Am'), g)
    const f = guitarVoicing(chord('F'), am)
    const move = (a: number[], b: number[]) => a.reduce((s, n, i) => s + Math.abs(n - b[i]), 0)
    expect(move(c, g)).toBeLessThanOrEqual(5)
    expect(move(g, am)).toBeLessThanOrEqual(5)
    expect(move(am, f)).toBeLessThanOrEqual(5)
  })

  it('分数コードは最低音がベース音', () => {
    const v = guitarVoicing(chord('C/E'))
    expect(pc(v[0])).toBe(4)
    expect(v[0]).toBeGreaterThanOrEqual(40)
  })
})

describe('powerChord', () => {
  it('ルート・5度・オクターブ', () => {
    expect(powerChord(chord('A'))).toEqual([45, 52, 57])
    expect(powerChord(chord('E'))).toEqual([40, 47, 52])
    expect(powerChord(chord('F'))).toEqual([41, 48, 53])
  })
})

describe('bassRoot', () => {
  it('全ルートが ベース音域内', () => {
    for (let r = 0; r < 12; r++) {
      const root = bassRoot(chord(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][r]))
      expect(root).toBeGreaterThanOrEqual(BASS_RANGE[0])
      expect(root).toBeLessThan(40)
      expect(pc(root)).toBe(r)
    }
  })
  it('分数コードはベース音', () => {
    expect(pc(bassRoot(chord('C/E')))).toBe(4)
  })
})

describe('keysVoicing', () => {
  it('右手は音域内、左手ルートは低音域', () => {
    for (const sym of ALL) {
      let v: number[]
      try { v = keysVoicing(chord(sym)) } catch (e) { throw new Error(sym + ' ' + String(e)) }
      expect(Math.min(...v), sym).toBeGreaterThanOrEqual(KEYS_RANGE[0])
      expect(Math.max(...v), sym).toBeLessThanOrEqual(KEYS_RANGE[1])
      const low = keysLowRoot(chord(sym))
      expect(low).toBeLessThan(48)
      expect(low).toBeGreaterThanOrEqual(36)
    }
  })
})

describe('nearestVoicing', () => {
  it('prev なしなら音域の中央付近', () => {
    const v = nearestVoicing([0, 4, 7], null, [48, 84])
    const avg = v.reduce((s, n) => s + n, 0) / v.length
    expect(Math.abs(avg - 66)).toBeLessThan(6)
  })
})
