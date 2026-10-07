// 設定・状態の保存/復元（localStorage）。壊れたデータや古い形式は既定値で補う。
import { DEFAULT_MIXER, MIXER_KEYS, type MixerState } from '../audio/mixer'
import { FILL_KINDS, type FillKind } from '../music/fills'
import { ALL_VARIANTS } from '../styles'

export interface Settings {
  text: string
  beatsPerBar: 3 | 4
  /** 移調（半音） */
  transpose: number
  variantId: string
  bpm: number
  loop: boolean
  countIn: boolean
  /** 0 / 4 / 8 小節ごとに自動フィル */
  autoFill: 0 | 4 | 8
  fills: Record<number, FillKind>
  /** A-B ループ範囲（end は含まない）。null で全体 */
  range: { start: number; end: number } | null
  mixer: MixerState
}

export const DEFAULT_SETTINGS: Settings = {
  text: '| C | G | Am | F |',
  beatsPerBar: 4,
  transpose: 0,
  variantId: 'rock-8beat',
  bpm: 120,
  loop: true,
  countIn: true,
  autoFill: 0,
  fills: {},
  range: null,
  mixer: DEFAULT_MIXER,
}

export const STORAGE_KEY = 'band-machine:v1'

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const num = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback

export function sanitize(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS
  if (!isObj(raw)) return d

  const fills: Record<number, FillKind> = {}
  if (isObj(raw.fills)) {
    for (const [k, v] of Object.entries(raw.fills)) {
      if (Number.isInteger(Number(k)) && FILL_KINDS.some((f) => f.kind === v)) fills[Number(k)] = v as FillKind
    }
  }

  const mixer = structuredClone(DEFAULT_MIXER)
  if (isObj(raw.mixer)) {
    for (const key of MIXER_KEYS) {
      const m = raw.mixer[key]
      if (!isObj(m)) continue
      mixer[key] = {
        mute: typeof m.mute === 'boolean' ? m.mute : mixer[key].mute,
        solo: typeof m.solo === 'boolean' ? m.solo : false,
        volume: num(m.volume, 0, 1, mixer[key].volume),
      }
    }
  }

  let range: Settings['range'] = null
  if (isObj(raw.range) && Number.isInteger(raw.range.start) && Number.isInteger(raw.range.end)) {
    const start = Math.max(0, raw.range.start as number)
    const end = raw.range.end as number
    if (end > start) range = { start, end }
  }

  return {
    text: typeof raw.text === 'string' ? raw.text : d.text,
    beatsPerBar: raw.beatsPerBar === 3 ? 3 : 4,
    transpose: Math.round(num(raw.transpose, -6, 6, 0)),
    variantId: ALL_VARIANTS.some((v) => v.id === raw.variantId) ? (raw.variantId as string) : d.variantId,
    bpm: Math.round(num(raw.bpm, 40, 240, d.bpm)),
    loop: typeof raw.loop === 'boolean' ? raw.loop : d.loop,
    countIn: typeof raw.countIn === 'boolean' ? raw.countIn : d.countIn,
    autoFill: raw.autoFill === 4 || raw.autoFill === 8 ? raw.autoFill : 0,
    fills,
    range,
    mixer,
  }
}

export function loadSettings(): Settings {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? sanitize(JSON.parse(s)) : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // 容量超過・プライベートモードなどは無視
  }
}
