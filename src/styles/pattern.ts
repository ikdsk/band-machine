// ステップ列文字列の解釈（純粋関数）
import { type Grid, stepsPerBeat } from './types'

/** 空白を除いたステップ配列 */
export function steps(pattern: string): string[] {
  return [...pattern.replace(/\s+/g, '')]
}

const DRUM_VELOCITY: Record<string, number> = { X: 1, x: 0.8, o: 0.55, g: 0.3 }

/** ドラム行 → ステップごとのベロシティ（0 は休み）。beats を渡すと拍数に切り詰める */
export function drumRow(pattern: string, grid: Grid, beats: number): number[] {
  return steps(pattern)
    .slice(0, beats * stepsPerBeat(grid))
    .map((c) => DRUM_VELOCITY[c] ?? 0)
}

export interface Hit {
  /** ステップ位置 */
  step: number
  /** ステップ数（'-' で伸ばした長さを含む） */
  length: number
  char: string
}

/** ピッチ系パターン → 発音位置と長さ。'.' と '-' 以外の文字が発音 */
export function hits(pattern: string, grid: Grid, beats: number): Hit[] {
  const s = steps(pattern).slice(0, beats * stepsPerBeat(grid))
  const out: Hit[] = []
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '.' || c === '-') continue
    let len = 1
    while (i + len < s.length && s[i + len] === '-') len++
    out.push({ step: i, length: len, char: c })
  }
  return out
}

/** ステップ位置 → 16分音符単位 */
export function stepToSixteenths(step: number, grid: Grid): number {
  return step * (4 / stepsPerBeat(grid))
}
