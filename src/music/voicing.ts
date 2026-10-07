// ボイシング（音域制限・最近接転回形）。純粋関数。MIDI ノート番号を扱う。
import { type Chord, bassPc } from './chords'

export type Range = readonly [lo: number, hi: number]

export const GUITAR_RANGE: Range = [50, 72] // D3〜C5
export const POWER_RANGE: Range = [40, 59] // E2〜B3
export const KEYS_RANGE: Range = [60, 79] // C4〜G5
export const KEYS_LOW_RANGE: Range = [36, 47] // 左手のルート C2〜B2
export const BASS_RANGE: Range = [28, 55] // E1〜G3

const mod12 = (n: number) => ((n % 12) + 12) % 12

/**
 * 声部数を制限した構成音（pitch class）。優先順: ルート・3度相当・7度/6度・テンション・5度。
 * 5度は声部が多いときに最初に省く。
 */
export function voicingPcs(chord: Chord, maxVoices: number): number[] {
  let ivs = chord.intervals.map((i) => i % 12).filter((v, i, a) => a.indexOf(v) === i)
  while (ivs.length > maxVoices) {
    const five = ivs.findIndex((v) => v === 7)
    ivs = five > 0 ? ivs.filter((_, i) => i !== five) : ivs.slice(0, -1)
  }
  return ivs.map((iv) => mod12(chord.root + iv))
}

/** ある音域内で pitch class の最小の音 */
export function lowestInRange(pc: number, range: Range): number {
  for (let m = range[0]; m <= range[1]; m++) if (mod12(m) === pc) return m
  throw new Error(`range ${range} に pc ${pc} がありません`)
}

/** 音域内で基準に最も近い音 */
export function nearestInRange(pc: number, target: number, range: Range): number {
  let best = lowestInRange(pc, range)
  for (let m = range[0]; m <= range[1]; m++) {
    if (mod12(m) === pc && Math.abs(m - target) < Math.abs(best - target)) best = m
  }
  return best
}

/** 全転回形・全オクターブの密集配置を列挙（すべて音域内） */
function candidates(pcs: number[], range: Range): number[][] {
  const out: number[][] = []
  // 音高順に並べた輪を回すと、密集配置の転回形がすべて得られる
  const ring = [...pcs].sort((a, b) => a - b)
  for (let k = 0; k < ring.length; k++) {
    const order = [...ring.slice(k), ...ring.slice(0, k)]
    for (let base = range[0]; base <= range[1]; base++) {
      if (mod12(base) !== order[0]) continue
      const notes = [base]
      for (let i = 1; i < order.length; i++) {
        let n = notes[i - 1] + 1
        while (mod12(n) !== order[i]) n++
        notes.push(n)
      }
      if (notes[notes.length - 1] <= range[1]) out.push(notes)
    }
  }
  return out
}

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length

/** 前の和音に最も近い転回形（なければ音域の中央付近）を選ぶ */
export function nearestVoicing(pcs: number[], prev: number[] | null, range: Range): number[] {
  const cands = candidates(pcs, range)
  if (cands.length === 0) throw new Error('音域内に配置できません')
  const center = (range[0] + range[1]) / 2
  let best = cands[0]
  let bestCost = Infinity
  for (const c of cands) {
    let cost: number
    if (prev && prev.length === c.length) {
      cost = c.reduce((s, n, i) => s + Math.abs(n - prev[i]), 0)
    } else if (prev) {
      cost = Math.abs(mean(c) - mean(prev)) * c.length
    } else {
      cost = Math.abs(mean(c) - center)
    }
    cost += (c[0] - range[0]) * 0.001 // 同点なら低い方
    if (cost < bestCost) {
      bestCost = cost
      best = c
    }
  }
  return best
}

/** ギターのコードボイシング（最大5声。分数コードは低いベース音を足す） */
export function guitarVoicing(chord: Chord, prev: number[] | null = null): number[] {
  const upper = nearestVoicing(voicingPcs(chord, 4), prev, GUITAR_RANGE)
  if (chord.bass !== undefined) {
    const low = upper[0] - 1
    for (let m = low; m >= 40; m--) {
      if (mod12(m) === chord.bass) return [m, ...upper]
    }
  }
  return upper
}

/** パワーコード: ルート＋5度＋オクターブ。ルートは E2〜 の最低音 */
export function powerChord(chord: Chord): number[] {
  const root = lowestInRange(chord.root, [40, 51])
  return [root, root + 7, root + 12]
}

/** ベースの基準音（ルートまたは分数のベース音）。E1〜D#2 の範囲 */
export function bassRoot(chord: Chord): number {
  return lowestInRange(bassPc(chord), [28, 39])
}

/** キーボード右手のボイシング */
export function keysVoicing(chord: Chord, prev: number[] | null = null): number[] {
  return nearestVoicing(voicingPcs(chord, 4), prev, KEYS_RANGE)
}

/** キーボード左手のルート（分数ならベース音） */
export function keysLowRoot(chord: Chord): number {
  return lowestInRange(bassPc(chord), KEYS_LOW_RANGE)
}
