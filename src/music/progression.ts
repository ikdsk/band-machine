// 進行テキスト → 小節・拍のチャート（エラー位置付き）。純粋関数。
import { type Chord, isNoChord, parseChord, transposeChord } from './chords'

export interface ChordEntry {
  /** null は N.C.（休み） */
  chord: Chord | null
  /** 小節内の開始拍（0 始まり） */
  startBeat: number
  /** 拍数 */
  beats: number
  /** 表示用ラベル */
  label: string
}

export interface ChartBar {
  index: number
  entries: ChordEntry[]
}

export interface ParseError {
  /** テキスト内の開始位置（文字オフセット） */
  start: number
  length: number
  /** 0 始まりの小節番号 */
  bar: number
  message: string
}

export interface Chart {
  bars: ChartBar[]
  errors: ParseError[]
}

interface Token {
  text: string
  start: number
}

/** 小節ごとに区切る。空の区間（先頭/末尾の | や ||）は無視する */
function splitBars(text: string): Token[][] {
  const bars: Token[][] = []
  let offset = 0
  for (const segment of text.split('|')) {
    const tokens: Token[] = []
    const re = /\S+/g
    let m: RegExpExecArray | null
    while ((m = re.exec(segment))) tokens.push({ text: m[0], start: offset + m.index })
    if (tokens.length > 0) bars.push(tokens)
    offset += segment.length + 1
  }
  return bars
}

/** n 個のスロットに beatsPerBar 拍を割り振る（余りは先頭から1拍ずつ） */
export function splitBeats(beatsPerBar: number, n: number): number[] {
  const base = Math.floor(beatsPerBar / n)
  const extra = beatsPerBar - base * n
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0))
}

const isRepeat = (t: string) => t === '%' || t === '-'

export function parseProgression(text: string, beatsPerBar = 4): Chart {
  const rawBars = splitBars(text)
  const bars: ChartBar[] = []
  const errors: ParseError[] = []

  if (rawBars.length === 0) {
    errors.push({ start: 0, length: 0, bar: 0, message: 'コード進行を入力してください' })
    return { bars, errors }
  }

  let lastEntry: ChordEntry | null = null

  rawBars.forEach((tokens, bi) => {
    // 小節全体の繰り返し: | % |
    if (tokens.length === 1 && isRepeat(tokens[0].text)) {
      const prev = bars[bi - 1]
      if (!prev) {
        errors.push({
          start: tokens[0].start,
          length: 1,
          bar: bi,
          message: '最初の小節に「%」は使えません',
        })
        bars.push({ index: bi, entries: [{ chord: null, startBeat: 0, beats: beatsPerBar, label: 'N.C.' }] })
        return
      }
      const entries = prev.entries.map((e) => ({ ...e }))
      bars.push({ index: bi, entries })
      lastEntry = entries[entries.length - 1]
      return
    }

    if (tokens.length > beatsPerBar) {
      const extra = tokens[beatsPerBar]
      const last = tokens[tokens.length - 1]
      errors.push({
        start: extra.start,
        length: last.start + last.text.length - extra.start,
        bar: bi,
        message: `${beatsPerBar}拍子の1小節にコードは${beatsPerBar}個までです`,
      })
    }

    const slots = tokens.slice(0, beatsPerBar)
    const beats = splitBeats(beatsPerBar, slots.length)
    const entries: ChordEntry[] = []
    let beat = 0

    slots.forEach((tok, si) => {
      const len = beats[si]
      if (isRepeat(tok.text)) {
        const prevEntry: ChordEntry | null = entries.length > 0 ? entries[entries.length - 1] : lastEntry
        if (!prevEntry) {
          errors.push({ start: tok.start, length: tok.text.length, bar: bi, message: '直前に繰り返すコードがありません' })
          entries.push({ chord: null, startBeat: beat, beats: len, label: 'N.C.' })
        } else if (entries.length > 0) {
          prevEntry.beats += len
        } else {
          entries.push({ chord: prevEntry.chord, startBeat: beat, beats: len, label: prevEntry.label })
        }
      } else if (isNoChord(tok.text)) {
        entries.push({ chord: null, startBeat: beat, beats: len, label: 'N.C.' })
      } else {
        const r = parseChord(tok.text)
        if (r.ok) {
          entries.push({ chord: r.value, startBeat: beat, beats: len, label: r.value.symbol })
        } else {
          errors.push({ start: tok.start, length: tok.text.length, bar: bi, message: r.error })
          entries.push({ chord: null, startBeat: beat, beats: len, label: tok.text })
        }
      }
      beat += len
    })

    bars.push({ index: bi, entries })
    lastEntry = entries[entries.length - 1] ?? lastEntry
  })

  return { bars, errors }
}

export function transposeChart(chart: Chart, semitones: number): Chart {
  if (semitones === 0) return chart
  return {
    errors: chart.errors,
    bars: chart.bars.map((b) => ({
      index: b.index,
      entries: b.entries.map((e) => {
        if (!e.chord) return e
        const chord = transposeChord(e.chord, semitones)
        return { ...e, chord, label: chord.symbol }
      }),
    })),
  }
}

/** 指定拍に鳴っているコード */
export function entryAtBeat(bar: ChartBar, beat: number): ChordEntry {
  let found = bar.entries[0]
  for (const e of bar.entries) if (e.startBeat <= beat) found = e
  return found
}
