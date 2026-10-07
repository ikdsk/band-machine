import { describe, expect, it } from 'vitest'
import { entryAtBeat, parseProgression, splitBeats, transposeChart } from './progression'

describe('parseProgression', () => {
  it('| C | G | Am | F | は4小節・各1コード4拍', () => {
    const { bars, errors } = parseProgression('| C | G | Am | F |')
    expect(errors).toEqual([])
    expect(bars).toHaveLength(4)
    expect(bars.map((b) => b.entries[0].label)).toEqual(['C', 'G', 'Am', 'F'])
    expect(bars[0].entries).toHaveLength(1)
    expect(bars[0].entries[0]).toMatchObject({ startBeat: 0, beats: 4 })
  })

  it('| 区切りは先頭・末尾なしでも良い', () => {
    expect(parseProgression('C | G').bars).toHaveLength(2)
  })

  it('1小節に複数コードなら拍を等分', () => {
    const { bars } = parseProgression('| C G | Am F |')
    expect(bars[0].entries.map((e) => [e.startBeat, e.beats])).toEqual([
      [0, 2],
      [2, 2],
    ])
  })

  it('4コードは各1拍、3コードは 2/1/1 拍', () => {
    const four = parseProgression('| C G Am F |').bars[0].entries
    expect(four.map((e) => e.beats)).toEqual([1, 1, 1, 1])
    const three = parseProgression('| C G Am |').bars[0].entries
    expect(three.map((e) => [e.startBeat, e.beats])).toEqual([
      [0, 2],
      [2, 1],
      [3, 1],
    ])
  })

  it('3/4 拍子では 3 拍で分割', () => {
    const { bars, errors } = parseProgression('| C G Am |', 3)
    expect(errors).toEqual([])
    expect(bars[0].entries.map((e) => e.beats)).toEqual([1, 1, 1])
    expect(splitBeats(3, 2)).toEqual([2, 1])
  })

  it('% は前の小節の繰り返し', () => {
    const { bars, errors } = parseProgression('| C G | % | Am |')
    expect(errors).toEqual([])
    expect(bars[1].entries.map((e) => e.label)).toEqual(['C', 'G'])
  })

  it('小節内の - / % は直前のコードを延ばす', () => {
    const { bars } = parseProgression('| C - G - | Am % - G |')
    expect(bars[0].entries.map((e) => [e.label, e.beats])).toEqual([
      ['C', 2],
      ['G', 2],
    ])
    expect(bars[1].entries.map((e) => [e.label, e.beats])).toEqual([
      ['Am', 3],
      ['G', 1],
    ])
  })

  it('小節頭の - は前小節の最後のコードを繰り返す（複数トークン）', () => {
    const { bars } = parseProgression('| C | - G |')
    expect(bars[1].entries.map((e) => [e.label, e.beats])).toEqual([
      ['C', 2],
      ['G', 2],
    ])
  })

  it('N.C. は休み', () => {
    const { bars, errors } = parseProgression('| N.C. | C |')
    expect(errors).toEqual([])
    expect(bars[0].entries[0].chord).toBeNull()
    expect(bars[0].entries[0].label).toBe('N.C.')
    expect(parseProgression('| NC |').bars[0].entries[0].chord).toBeNull()
  })

  it('改行を空白として扱う', () => {
    const { bars, errors } = parseProgression('| C | G |\n| Am | F |')
    expect(errors).toEqual([])
    expect(bars).toHaveLength(4)
  })

  it('不正なコードは位置付きでエラー', () => {
    const text = '| C | Hm | G |'
    const { errors } = parseProgression(text)
    expect(errors).toHaveLength(1)
    expect(errors[0].bar).toBe(1)
    expect(text.slice(errors[0].start, errors[0].start + errors[0].length)).toBe('Hm')
  })

  it('コードが多すぎる小節はエラー', () => {
    const { errors } = parseProgression('| C G Am F Em |')
    expect(errors).toHaveLength(1)
    expect(errors[0].bar).toBe(0)
  })

  it('最初の小節の % はエラー', () => {
    expect(parseProgression('| % | C |').errors).toHaveLength(1)
  })

  it('空入力はエラー', () => {
    const r = parseProgression('  | | ')
    expect(r.bars).toHaveLength(0)
    expect(r.errors).toHaveLength(1)
  })
})

describe('transposeChart / entryAtBeat', () => {
  it('全コードを移調する', () => {
    const t = transposeChart(parseProgression('| C | G/B | N.C. |'), 2)
    expect(t.bars.map((b) => b.entries[0].label)).toEqual(['D', 'A/C#', 'N.C.'])
  })
  it('拍に対応するコードを返す', () => {
    const { bars } = parseProgression('| C G |')
    expect(entryAtBeat(bars[0], 1).label).toBe('C')
    expect(entryAtBeat(bars[0], 2).label).toBe('G')
    expect(entryAtBeat(bars[0], 3).label).toBe('G')
  })
})
