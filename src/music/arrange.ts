// チャート＋スタイル＋フィル指定 → 楽器別ノートイベント列（純粋関数）。
// ミュート/ソロは再生層の責務なので、ここでは全パートを出力する。
import type { StyleVariant, BassStyle, GuitarStyle, KeysStyle, Grid, DrumRows } from '../styles/types'
import { stepsPerBeat } from '../styles/types'
import { drumRow, hits, stepToSixteenths } from '../styles/pattern'
import { bassPc, type Chord } from './chords'
import {
  type FillKind,
  autoFillBars,
  fillHits,
  fillStart,
  resolveFillKind,
} from './fills'
import type { Chart, ChartBar, ChordEntry } from './progression'
import { entryAtBeat } from './progression'
import { type DrumPiece, type NoteEvent, type Timbre, timeAt } from './types'
import {
  BASS_RANGE,
  bassRoot,
  guitarVoicing,
  keysLowRoot,
  keysVoicing,
  lowestInRange,
  nearestInRange,
  powerChord,
} from './voicing'

export interface BarRange {
  /** 0 始まり、含む */
  start: number
  /** 含まない */
  end: number
}

export interface ArrangeOptions {
  chart: Chart
  variant: StyleVariant
  beatsPerBar: number
  /** 小節番号 → フィル種類。キーがある小節がフィル指定 */
  fills?: Record<number, FillKind>
  /** 0=なし / 4 / 8 小節ごとに自動フィル */
  autoFill?: number
  /** ループ再生か（ループ末尾がフィルなら、ループ先頭にクラッシュを入れる） */
  loop?: boolean
  /** 出力する小節範囲。省略で全小節 */
  range?: BarRange
}

const EPS = 1e-6

export function arrange(opts: ArrangeOptions): NoteEvent[] {
  const { chart } = opts
  const total = chart.bars.length
  if (total === 0) return []
  const range = clampRange(opts.range, total)
  const explicit = opts.fills ?? {}

  // フィル指定: 明示指定が優先。自動フィルは範囲内のみ
  const fillKinds = new Map<number, FillKind>()
  for (const b of autoFillBars(range.end, opts.autoFill ?? 0, range.start)) fillKinds.set(b, 'auto')
  for (const [k, v] of Object.entries(explicit)) {
    const b = Number(k)
    if (b >= 0 && b < total) fillKinds.set(b, v)
  }

  const events: NoteEvent[] = []
  const voices = new VoiceState()

  for (const bar of chart.bars) {
    // ボイシングの連続性のため、範囲外の小節も計算してから捨てる
    const barEvents = arrangeBar(bar, chart, opts, fillKinds, range, voices)
    if (bar.index >= range.start && bar.index < range.end) events.push(...barEvents)
  }
  return events.sort(
    (a, b) =>
      a.time.bar - b.time.bar ||
      a.time.beat * 4 + a.time.sixteenth - (b.time.beat * 4 + b.time.sixteenth),
  )
}

function clampRange(r: BarRange | undefined, total: number): BarRange {
  if (!r) return { start: 0, end: total }
  const start = Math.max(0, Math.min(total - 1, r.start))
  const end = Math.max(start + 1, Math.min(total, r.end))
  return { start, end }
}

/** 楽器ごとの直前ボイシング（ボイスリーディング用） */
class VoiceState {
  guitar: number[] | null = null
  keys: number[] | null = null
  bass: number | null = null
}

function arrangeBar(
  bar: ChartBar,
  chart: Chart,
  opts: ArrangeOptions,
  fillKinds: Map<number, FillKind>,
  range: BarRange,
  voices: VoiceState,
): NoteEvent[] {
  const { variant, beatsPerBar } = opts
  const kind = fillKinds.get(bar.index)
  const isBreak = kind === 'break'

  const fillBefore =
    fillKinds.has(bar.index - 1) ||
    (!!opts.loop && bar.index === range.start && fillKinds.has(range.end - 1))

  const out: NoteEvent[] = []
  out.push(...drumsForBar(bar.index, variant.drums, beatsPerBar, kind, fillBefore))

  if (isBreak) {
    out.push(...breakStabs(bar, variant, voices))
    return out
  }

  out.push(...bassForBar(bar, chart, variant.bass, beatsPerBar, voices))
  out.push(...guitarForBar(bar, variant.guitar, beatsPerBar, voices))
  if (variant.keys) out.push(...keysForBar(bar, variant.keys, beatsPerBar, voices))
  return out
}

// ---------------------------------------------------------------- ドラム

function drumsForBar(
  barIndex: number,
  style: StyleVariant['drums'],
  beatsPerBar: number,
  kind: FillKind | undefined,
  fillBefore: boolean,
): NoteEvent[] {
  const { grid } = style
  const hit = (drum: DrumPiece, at: number, velocity: number): NoteEvent => ({
    part: 'drums',
    drum,
    time: timeAt(barIndex, at),
    duration: 1,
    velocity,
  })

  if (kind === 'break') {
    return [hit('crash', 0, 1), hit('kick', 0, 1)]
  }

  const rows = rowsFor(style, beatsPerBar)
  let list: { drum: DrumPiece; at: number; velocity: number }[] = []
  for (const [piece, pattern] of Object.entries(rows) as [DrumPiece, string][]) {
    drumRow(pattern, grid, beatsPerBar).forEach((vel, i) => {
      if (vel > 0) list.push({ drum: piece, at: stepToSixteenths(i, grid), velocity: vel })
    })
  }

  if (kind !== undefined) {
    const resolved = resolveFillKind(kind, style.fill)
    if (resolved !== 'break') {
      const start = fillStart(resolved, beatsPerBar)
      list = list.filter((h) => h.at < start - EPS)
      list.push(...fillHits(resolved, beatsPerBar).map((h) => ({ drum: h.drum, at: h.at, velocity: h.velocity })))
    }
  }

  if (fillBefore) {
    if (!list.some((h) => h.drum === 'crash' && h.at < EPS)) list.push({ drum: 'crash', at: 0, velocity: 1 })
    if (!list.some((h) => h.drum === 'kick' && h.at < EPS)) list.push({ drum: 'kick', at: 0, velocity: 0.9 })
  }

  return list.map((h) => hit(h.drum, h.at, h.velocity))
}

/** 3/4 で rows3 がなければ 4/4 を切り詰め、3拍目にバックビートのスネアを足す */
function rowsFor(style: StyleVariant['drums'], beatsPerBar: number): DrumRows {
  if (beatsPerBar !== 3) return style.rows
  if (style.rows3) return style.rows3
  const spb = stepsPerBeat(style.grid)
  const rows: DrumRows = { ...style.rows }
  const snare = [...(rows.snare ?? '').replace(/\s+/g, '').padEnd(4 * spb, '.')].slice(0, 3 * spb)
  const beat3 = snare.slice(2 * spb).some((c) => c !== '.')
  if (!beat3) snare[2 * spb] = 'o'
  rows.snare = snare.join('')
  return rows
}

// ---------------------------------------------------------------- 共通

interface Placed {
  at: number
  duration: number
  char: string
  entry: ChordEntry
}

/** パターンを小節に展開し、各発音にそのときのコードを結びつける。コードが変わる所で音を切る */
function placeHits(bar: ChartBar, pattern: string, grid: Grid, beatsPerBar: number, defaultChar: string): Placed[] {
  const spb = stepsPerBeat(grid)
  const out: Placed[] = []
  for (const h of hits(pattern, grid, beatsPerBar)) {
    const at = stepToSixteenths(h.step, grid)
    const entry = entryAtBeat(bar, Math.floor(at / 4 + EPS))
    if (!entry.chord) continue
    const entryEnd = (entry.startBeat + entry.beats) * 4
    out.push({ at, duration: Math.min(h.length * (4 / spb), entryEnd - at), char: h.char, entry })
  }
  // 発音のないコードには、頭に1発入れる
  for (const entry of bar.entries) {
    if (!entry.chord) continue
    const start = entry.startBeat * 4
    const end = start + entry.beats * 4
    if (!out.some((p) => p.entry === entry && p.at >= start - EPS && p.at < end - EPS)) {
      out.push({ at: start, duration: Math.min(entry.beats * 4, 8), char: defaultChar, entry })
    }
  }
  return out.sort((a, b) => a.at - b.at)
}

// ---------------------------------------------------------------- ベース

function chordThird(chord: Chord): number {
  return chord.intervals.map((i) => i % 12).find((i) => i >= 2 && i <= 5) ?? 4
}

function fitBass(pitch: number): number {
  let p = pitch
  while (p > BASS_RANGE[1]) p -= 12
  while (p < BASS_RANGE[0]) p += 12
  return p
}

function bassForBar(
  bar: ChartBar,
  chart: Chart,
  style: BassStyle,
  beatsPerBar: number,
  voices: VoiceState,
): NoteEvent[] {
  if (style.kind === 'walking') return walkingBass(bar, chart, beatsPerBar, voices)

  const out: NoteEvent[] = []
  for (const p of placeHits(bar, patternFor(style, beatsPerBar), style.grid, beatsPerBar, 'x')) {
    const chord = p.entry.chord!
    const root = bassRoot(chord)
    const offset: Record<string, number> = {
      x: 0,
      X: 0,
      m: 0,
      u: 12,
      f: 7,
      t: chordThird(chord),
      s: 9,
    }
    const pitch = fitBass(root + (offset[p.char] ?? 0))
    voices.bass = pitch
    out.push({
      part: 'bass',
      pitches: [pitch],
      time: timeAt(bar.index, p.at),
      duration: p.char === 'm' ? Math.min(p.duration, 1) : p.duration,
      velocity: p.char === 'X' ? 1 : p.char === 'm' ? 0.5 : 0.8,
    })
  }
  return out
}

/** ウォーキング: コードの頭=ルート、途中=コード音、コード末尾=次のルートへの半音アプローチ */
function walkingBass(bar: ChartBar, chart: Chart, beatsPerBar: number, voices: VoiceState): NoteEvent[] {
  const out: NoteEvent[] = []
  const WALK: Range2 = [28, 50]
  bar.entries.forEach((entry, ei) => {
    const chord = entry.chord
    if (!chord) return
    const next = nextChord(bar, ei, chart)
    for (let k = 0; k < entry.beats; k++) {
      const beat = entry.startBeat + k
      const first = k === 0
      const last = k === entry.beats - 1
      const rootPc = bassPc(chord)
      const prev = voices.bass ?? lowestInRange(rootPc, [33, 44])
      let pc: number
      let exact: number | null = null
      if (first) {
        pc = rootPc
      } else if (last && next) {
        const target = nearestInRange(bassPc(next), prev, WALK)
        exact = target + (prev > target ? 1 : -1)
        pc = ((exact % 12) + 12) % 12
      } else {
        const tones = [chord.root + chordThird(chord), chord.root + 7, chord.root + 12, chord.root + 7]
        const idx = (k + bar.index) % tones.length
        pc = ((tones[idx] % 12) + 12) % 12
      }
      const pitch = exact !== null ? Math.min(WALK[1], Math.max(WALK[0], exact)) : nearestInRange(pc, prev, WALK)
      voices.bass = pitch
      out.push({
        part: 'bass',
        pitches: [pitch],
        time: timeAt(bar.index, beat * 4),
        duration: 3.6,
        velocity: first ? 0.95 : 0.8,
      })
    }
  })
  return out
}

type Range2 = readonly [number, number]

/** 小節内のコードの、次のコード（小節をまたぐ。最後の小節は先頭の小節に回り込む） */
function nextChord(bar: ChartBar, entryIndex: number, chart: Chart): Chord | null {
  for (let i = entryIndex + 1; i < bar.entries.length; i++) if (bar.entries[i].chord) return bar.entries[i].chord
  const n = chart.bars.length
  for (let d = 1; d <= n; d++) {
    const b = chart.bars[(bar.index + d) % n]
    const c = b.entries.find((e) => e.chord)?.chord
    if (c) return c
  }
  return null
}

function patternFor(style: { steps: string; steps3?: string }, beatsPerBar: number): string {
  return beatsPerBar === 3 && style.steps3 ? style.steps3 : style.steps
}

// ---------------------------------------------------------------- ギター

function guitarForBar(bar: ChartBar, style: GuitarStyle, beatsPerBar: number, voices: VoiceState): NoteEvent[] {
  const out: NoteEvent[] = []
  const defaultChar = style.kind === 'strum' ? 'D' : style.kind === 'power' ? 'X' : '1'
  const voicingByEntry = new Map<ChordEntry, number[]>()
  const voicingOf = (entry: ChordEntry): number[] => {
    let v = voicingByEntry.get(entry)
    if (!v) {
      v = style.kind === 'power' ? powerChord(entry.chord!) : guitarVoicing(entry.chord!, voices.guitar)
      if (style.kind !== 'power') voices.guitar = v.length > 4 ? v.slice(1) : v
      voicingByEntry.set(entry, v)
    }
    return v
  }

  for (const p of placeHits(bar, patternFor(style, beatsPerBar), style.grid, beatsPerBar, defaultChar)) {
    const voicing = voicingOf(p.entry)
    const base = { part: 'guitar' as const, time: timeAt(bar.index, p.at), timbre: style.timbre }
    if (style.kind === 'strum') {
      const vel: Record<string, number> = { D: 0.95, d: 0.65, U: 0.75, u: 0.5, x: 0.55 }
      const muted = p.char === 'x'
      out.push({
        ...base,
        pitches: voicing,
        duration: muted ? Math.min(p.duration, 0.6) : p.duration,
        velocity: vel[p.char] ?? 0.7,
        strum: p.char === 'U' || p.char === 'u' ? 'up' : 'down',
      })
    } else if (style.kind === 'power') {
      const palm = p.char === 'p'
      out.push({
        ...base,
        pitches: voicing,
        duration: palm ? Math.min(p.duration, 0.6) : p.duration,
        velocity: p.char === 'X' ? 1 : palm ? 0.65 : 0.85,
        strum: 'down',
      })
    } else {
      const d = Number(p.char)
      if (!Number.isInteger(d) || d < 1) continue
      out.push({
        ...base,
        pitches: [voicing[(d - 1) % voicing.length]],
        duration: p.duration * 1.5,
        velocity: p.at === 0 ? 0.75 : 0.62,
      })
    }
  }
  return out
}

// ---------------------------------------------------------------- キーボード

function keysForBar(bar: ChartBar, style: KeysStyle, beatsPerBar: number, voices: VoiceState): NoteEvent[] {
  const out: NoteEvent[] = []
  const rhByEntry = new Map<ChordEntry, number[]>()
  const rhOf = (entry: ChordEntry): number[] => {
    let v = rhByEntry.get(entry)
    if (!v) {
      v = keysVoicing(entry.chord!, voices.keys)
      voices.keys = v
      rhByEntry.set(entry, v)
    }
    return v
  }

  const defaultChar = style.kind === 'comp' ? 'x' : '1'
  for (const p of placeHits(bar, patternFor(style, beatsPerBar), style.grid, beatsPerBar, defaultChar)) {
    const chord = p.entry.chord!
    const rh = rhOf(p.entry)
    const base = { part: 'keys' as const, time: timeAt(bar.index, p.at), timbre: style.timbre as Timbre }
    if (style.kind === 'comp') {
      const vel: Record<string, number> = { X: 0.9, x: 0.75, o: 0.55 }
      out.push({
        ...base,
        pitches: p.char === 'X' ? [keysLowRoot(chord), ...rh] : rh,
        duration: p.duration,
        velocity: vel[p.char] ?? 0.7,
      })
    } else {
      const low = keysLowRoot(chord)
      const set = [low, low + 7, ...rh]
      const d = Number(p.char)
      if (!Number.isInteger(d) || d < 1) continue
      out.push({
        ...base,
        pitches: [set[(d - 1) % set.length]],
        duration: p.duration * 1.5,
        velocity: d <= 2 ? 0.6 : 0.5,
      })
    }
  }
  return out
}

// ---------------------------------------------------------------- ブレイク

/** ブレイク小節: 1拍目のキメだけを全員で鳴らし、あとは止まる（ドラムは drumsForBar 側） */
function breakStabs(bar: ChartBar, variant: StyleVariant, voices: VoiceState): NoteEvent[] {
  const entry = entryAtBeat(bar, 0)
  const chord = entry.chord
  if (!chord) return []
  const time = timeAt(bar.index, 0)
  const duration = 4
  const out: NoteEvent[] = []
  out.push({ part: 'bass', pitches: [fitBass(bassRoot(chord))], time, duration, velocity: 1 })

  const g = variant.guitar
  const gv = g.kind === 'power' ? powerChord(chord) : guitarVoicing(chord, voices.guitar)
  if (g.kind !== 'power') voices.guitar = gv.length > 4 ? gv.slice(1) : gv
  out.push({ part: 'guitar', pitches: gv, time, duration, velocity: 1, timbre: g.timbre, strum: 'down' })

  if (variant.keys) {
    const rh = keysVoicing(chord, voices.keys)
    voices.keys = rh
    out.push({
      part: 'keys',
      pitches: [keysLowRoot(chord), ...rh],
      time,
      duration,
      velocity: 0.95,
      timbre: variant.keys.timbre,
    })
  }
  return out
}
