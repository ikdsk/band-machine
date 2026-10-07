// フィルインの種類・内容と、自動フィルの位置決め（純粋関数）
import type { FillStyle } from '../styles/types'
import type { DrumPiece } from './types'

export type FillKind = 'auto' | 'toms' | 'snare' | 'simple' | 'break'
export type ResolvedFill = Exclude<FillKind, 'auto'>

export const FILL_KINDS: { kind: FillKind; label: string }[] = [
  { kind: 'auto', label: '自動（ジャンル既定）' },
  { kind: 'toms', label: 'タム回し' },
  { kind: 'snare', label: 'スネア連打' },
  { kind: 'simple', label: 'シンプル（最後の拍）' },
  { kind: 'break', label: 'ブレイク（キメで止まる）' },
]

export function fillLabel(kind: FillKind): string {
  return FILL_KINDS.find((f) => f.kind === kind)?.label ?? kind
}

export function resolveFillKind(kind: FillKind, genreDefault: FillStyle): ResolvedFill {
  return kind === 'auto' ? genreDefault : kind
}

export interface FillHit {
  /** 小節内の位置（16分単位） */
  at: number
  drum: DrumPiece
  velocity: number
}

/** 小節末尾に揃えて並べるフィルの中身。長さは16分単位 */
const FILLS: Record<'toms' | 'snare' | 'simple', { length: number; hits: [number, DrumPiece, number][] }> = {
  toms: {
    length: 8,
    hits: [
      [0, 'kick', 0.9],
      [0, 'tom1', 0.85],
      [1, 'tom1', 0.7],
      [2, 'tom1', 0.85],
      [3, 'tom2', 0.75],
      [4, 'tom2', 0.9],
      [5, 'tom2', 0.75],
      [6, 'tom3', 0.95],
      [7, 'tom3', 1],
    ],
  },
  snare: {
    length: 8,
    hits: [
      [0, 'kick', 0.9],
      [0, 'snare', 0.55],
      [1, 'snare', 0.6],
      [2, 'snare', 0.65],
      [3, 'snare', 0.7],
      [4, 'snare', 0.78],
      [5, 'snare', 0.85],
      [6, 'snare', 0.92],
      [7, 'snare', 1],
    ],
  },
  simple: {
    length: 4,
    hits: [
      [0, 'kick', 0.9],
      [0, 'snare', 0.85],
      [2, 'snare', 0.8],
      [3, 'snare', 0.95],
    ],
  },
}

/** フィルが通常パターンを置き換え始める位置（16分単位） */
export function fillStart(kind: 'toms' | 'snare' | 'simple', beatsPerBar: number): number {
  return beatsPerBar * 4 - FILLS[kind].length
}

export function fillHits(kind: 'toms' | 'snare' | 'simple', beatsPerBar: number): FillHit[] {
  const start = fillStart(kind, beatsPerBar)
  return FILLS[kind].hits.map(([at, drum, velocity]) => ({ at: start + at, drum, velocity }))
}

/**
 * 「N小節ごとに自動フィル」の対象小節（0 始まり）。
 * start 小節から数えて N 小節目（= N 小節のまとまりの最後）にフィルが入る。every=0 で無効。
 */
export function autoFillBars(endBar: number, every: number, startBar = 0): number[] {
  if (every <= 0) return []
  const bars: number[] = []
  for (let b = startBar + every - 1; b < endBar; b += every) bars.push(b)
  return bars
}
