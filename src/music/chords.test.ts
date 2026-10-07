import { describe, expect, it } from 'vitest'
import { type Chord, bassPc, parseChord, transposeChord } from './chords'

function chord(text: string): Chord {
  const r = parseChord(text)
  if (!r.ok) throw new Error(r.error)
  return r.value
}
const semis = (text: string) => chord(text).intervals.map((i) => i % 12).sort((a, b) => a - b)

describe('parseChord: クオリティ', () => {
  const cases: [string, number[]][] = [
    ['C', [0, 4, 7]],
    ['Cm', [0, 3, 7]],
    ['C7', [0, 4, 7, 10]],
    ['Cmaj7', [0, 4, 7, 11]],
    ['CM7', [0, 4, 7, 11]],
    ['Cm7', [0, 3, 7, 10]],
    ['Csus2', [0, 2, 7]],
    ['Csus4', [0, 5, 7]],
    ['Cadd9', [0, 2, 4, 7]],
    ['Cdim', [0, 3, 6]],
    ['Caug', [0, 4, 8]],
    ['Cm7b5', [0, 3, 6, 10]],
    ['C6', [0, 4, 7, 9]],
    ['Cm6', [0, 3, 7, 9]],
    ['C9', [0, 2, 4, 7, 10]],
  ]
  for (const [text, expected] of cases) {
    it(`${text} の構成音`, () => {
      expect(semis(text)).toEqual(expected)
    })
  }

  it('ルートが C 以外でも pitch class が移動する', () => {
    expect(chord('Am').pcs).toEqual([9, 0, 4])
    expect(chord('F#m7').pcs).toEqual([6, 9, 1, 4])
    expect(chord('Bb').root).toBe(10)
    expect(chord('Ebmaj7').pcs).toEqual([3, 7, 10, 2])
  })

  it('テンション', () => {
    expect(semis('G7b9')).toEqual([0, 1, 4, 7, 10])
    expect(semis('G7#9')).toEqual([0, 3, 4, 7, 10])
    expect(semis('G7(b13)')).toEqual([0, 4, 7, 8, 10])
    expect(semis('G7#5')).toEqual([0, 4, 8, 10])
    expect(semis('Cmaj7#11')).toEqual([0, 4, 6, 7, 11])
    expect(semis('C7sus4')).toEqual([0, 5, 7, 10])
    expect(semis('Cm7(9)')).toEqual([0, 2, 3, 7, 10])
  })
})

describe('parseChord: 分数コード', () => {
  it('C/E のベースは E', () => {
    const c = chord('C/E')
    expect(c.root).toBe(0)
    expect(c.bass).toBe(4)
    expect(bassPc(c)).toBe(4)
    expect(c.pcs).toEqual([0, 4, 7])
  })
  it('分数でなければベースはルート', () => {
    expect(bassPc(chord('Am'))).toBe(9)
  })
  it('Am7/G, D/F#', () => {
    expect(chord('Am7/G').bass).toBe(7)
    expect(chord('D/F#').bass).toBe(6)
  })
  it('不正なベースはエラー', () => {
    expect(parseChord('C/H').ok).toBe(false)
    expect(parseChord('C/').ok).toBe(false)
  })
})

describe('parseChord: 不正入力', () => {
  for (const bad of ['', 'H', 'X7', 'Cfoo', 'c', 'C7z', '7', 'Cmaj7#']) {
    it(`「${bad}」はエラー`, () => {
      const r = parseChord(bad)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.length).toBeGreaterThan(0)
    })
  }
})

describe('transposeChord', () => {
  it('ルートとベースが移動し、記号が更新される', () => {
    const t = transposeChord(chord('C/E'), 2)
    expect(t.symbol).toBe('D/F#')
    expect(t.pcs).toEqual([2, 6, 9])
  })
  it('フラット表記を維持する', () => {
    expect(transposeChord(chord('Bbm7'), 1).symbol).toBe('Bm7')
    expect(transposeChord(chord('Bb'), 2).symbol).toBe('C')
    expect(transposeChord(chord('Eb'), 1).symbol).toBe('E')
    expect(transposeChord(chord('Eb'), -1).symbol).toBe('D')
  })
})
