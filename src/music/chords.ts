// コード記号パーサ（純粋関数）。ルート/クオリティ/テンション/分数ベース → 構成音。

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export interface Chord {
  /** 入力どおりの記号（表示用） */
  symbol: string
  /** ルートの pitch class (0=C) */
  root: number
  /** ルートの表記（C, F#, Bb ...） */
  rootName: string
  /** ルートより後ろ・ベースより前の部分（"m7", "7(b9)" 等） */
  suffix: string
  /** ルートからの半音距離。並びは [ルート, 3度相当, 5度, 7度/6度, テンション...]。1オクターブ超も可 */
  intervals: number[]
  /** 構成音の pitch class（intervals と同順・重複なし） */
  pcs: number[]
  /** 分数コードのベース音の pitch class。なければ undefined */
  bass?: number
  bassName?: string
}

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export function parseNoteName(text: string): number | null {
  const m = /^([A-G])([#b♯♭]?)$/.exec(text)
  if (!m) return null
  let pc = NATURAL[m[1]]
  if (m[2] === '#' || m[2] === '♯') pc += 1
  if (m[2] === 'b' || m[2] === '♭') pc -= 1
  return (pc + 12) % 12
}

export function noteName(pc: number, preferFlat = false): string {
  const i = ((pc % 12) + 12) % 12
  return (preferFlat ? FLAT_NAMES : SHARP_NAMES)[i]
}

/** クオリティ表記 → 半音距離。別名は同じ配列を共有する */
const QUALITIES: Record<string, number[]> = {}
function def(names: string[], intervals: number[]) {
  for (const n of names) QUALITIES[n] = intervals
}
def(['', 'M', 'maj'], [0, 4, 7])
def(['m', 'min', '-'], [0, 3, 7])
def(['7'], [0, 4, 7, 10])
def(['maj7', 'M7', '△7', 'Δ7'], [0, 4, 7, 11])
def(['m7', 'min7', '-7'], [0, 3, 7, 10])
def(['mmaj7', 'mM7', 'mMaj7'], [0, 3, 7, 11])
def(['sus2'], [0, 2, 7])
def(['sus4', 'sus'], [0, 5, 7])
def(['7sus4', '7sus'], [0, 5, 7, 10])
def(['dim', 'o'], [0, 3, 6])
def(['dim7', 'o7'], [0, 3, 6, 9])
def(['aug', '+'], [0, 4, 8])
def(['m7b5', 'm7-5', 'ø', 'ø7'], [0, 3, 6, 10])
def(['6'], [0, 4, 7, 9])
def(['m6', 'min6'], [0, 3, 7, 9])
def(['9'], [0, 4, 7, 10, 14])
def(['m9', 'min9'], [0, 3, 7, 10, 14])
def(['maj9', 'M9'], [0, 4, 7, 11, 14])
def(['13'], [0, 4, 7, 10, 14, 21])

// 長いものから照合する
const QUALITY_KEYS = Object.keys(QUALITIES).sort((a, b) => b.length - a.length)

/** テンション（クオリティの後ろに付く）。b5/#5 は5度を置換し、他は追加する */
const TENSIONS: { token: string; add?: number; replaceFifth?: number }[] = [
  { token: 'add11', add: 17 },
  { token: 'add13', add: 21 },
  { token: 'add9', add: 14 },
  { token: '#11', add: 18 },
  { token: 'b13', add: 20 },
  { token: 'b9', add: 13 },
  { token: '#9', add: 15 },
  { token: '13', add: 21 },
  { token: '11', add: 17 },
  { token: '9', add: 14 },
  { token: 'b5', replaceFifth: 6 },
  { token: '-5', replaceFifth: 6 },
  { token: '#5', replaceFifth: 8 },
  { token: '+5', replaceFifth: 8 },
]

function parseTensions(rest: string, intervals: number[]): number[] | null {
  let s = rest.replace(/[()]/g, '').replace(/,/g, '')
  const out = [...intervals]
  while (s.length > 0) {
    const t = TENSIONS.find((x) => s.startsWith(x.token))
    if (!t) return null
    s = s.slice(t.token.length)
    if (t.replaceFifth !== undefined) {
      const i = out.findIndex((v) => v % 12 === 7 || v % 12 === 6 || v % 12 === 8)
      if (i >= 0) out[i] = t.replaceFifth
      else out.push(t.replaceFifth)
    } else if (t.add !== undefined) {
      if (!out.some((v) => v % 12 === t.add! % 12)) out.push(t.add)
    }
  }
  return out
}

/** N.C. かどうか（大文字小文字・ピリオド有無を許容） */
export function isNoChord(token: string): boolean {
  return /^n\.?c\.?$/i.test(token)
}

/** 1つのコード記号を解析する（N.C. / % / - はここでは扱わない） */
export function parseChord(text: string): Result<Chord> {
  const symbol = text.trim()
  if (symbol === '') return { ok: false, error: 'コードが空です' }

  const slash = symbol.lastIndexOf('/')
  const body = slash >= 0 ? symbol.slice(0, slash) : symbol
  const bassText = slash >= 0 ? symbol.slice(slash + 1) : null

  const rootMatch = /^([A-G][#b♯♭]?)(.*)$/.exec(body)
  if (!rootMatch) return { ok: false, error: `「${symbol}」はコードとして読めません（ルートは A〜G）` }
  const rootName = rootMatch[1]
  const root = parseNoteName(rootName)!
  const rest = rootMatch[2]

  // クオリティ照合。'' は常に最後の候補
  const q = QUALITY_KEYS.find((k) => k !== '' && rest.startsWith(k))
  let intervals: number[] | null = null
  if (q !== undefined) {
    const withTensions = parseTensions(rest.slice(q.length), QUALITIES[q])
    if (withTensions) {
      intervals = withTensions
    }
  }
  if (!intervals) {
    // 例: "Cadd9" "Cb9" など、クオリティなし＋テンション
    const withTensions = parseTensions(rest, QUALITIES[''])
    if (withTensions) intervals = withTensions
  }
  if (!intervals) return { ok: false, error: `「${symbol}」のコード種類が分かりません` }

  let bass: number | undefined
  let bassName: string | undefined
  if (bassText !== null) {
    const b = parseNoteName(bassText)
    if (b === null) return { ok: false, error: `「${symbol}」のベース音「${bassText}」が不正です` }
    bass = b
    bassName = bassText
  }

  const pcs: number[] = []
  for (const iv of intervals) {
    const pc = (root + iv) % 12
    if (!pcs.includes(pc)) pcs.push(pc)
  }
  return {
    ok: true,
    value: { symbol, root, rootName, suffix: rest, intervals, pcs, bass, bassName },
  }
}

/** ベース音（分数コードならそちら、なければルート） */
export function bassPc(chord: Chord): number {
  return chord.bass ?? chord.root
}

export function transposeChord(chord: Chord, semitones: number): Chord {
  const flat = chord.rootName.includes('b') || chord.rootName.includes('♭')
  const shift = (pc: number) => (((pc + semitones) % 12) + 12) % 12
  const root = shift(chord.root)
  const rootName = noteName(root, flat)
  const bass = chord.bass === undefined ? undefined : shift(chord.bass)
  const bassName = bass === undefined ? undefined : noteName(bass, flat)
  return {
    ...chord,
    root,
    rootName,
    bass,
    bassName,
    pcs: chord.pcs.map(shift),
    symbol: `${rootName}${chord.suffix}${bassName ? `/${bassName}` : ''}`,
  }
}
