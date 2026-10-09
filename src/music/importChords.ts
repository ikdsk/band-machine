// コード譜テキスト（コピー＆貼り付け）→ アプリの進行形式。純粋関数。
// 外部サイトへのアクセスはしない。貼り付けられたテキストだけを処理する。
import { isNoChord, parseChord, transposeChord } from './chords'

export interface ImportOptions {
  /** 小節線がないときの 1 小節あたりのコード数。auto は 1 行 4 コード以下なら 1、5 以上なら 2 */
  chordsPerBar: 1 | 2 | 'auto'
  /** カポ表記があるとき、その半音数ぶん上げて実音のコードにする */
  capoTranspose: boolean
}

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = { chordsPerBar: 'auto', capoTranspose: false }

export interface ImportSection {
  /** セクション名。見出しがない先頭部分は '' */
  name: string
  /** 1 小節ぶんの文字列（例: "C G"） */
  bars: string[]
}

export interface ImportResult {
  /** 進行入力にそのまま入れられるテキスト */
  text: string
  sections: ImportSection[]
  warnings: string[]
  /** 抽出したコードの数（N.C. と継続記号は含まない） */
  chordCount: number
  /** 検出したカポ位置。なければ null */
  capo: number | null
}

/** 1 小節に入れるコードの上限（4/4 拍子） */
const MAX_PER_BAR = 4

// ---------------------------------------------------------------- コード記号の正規化

/** 全角を半角にそろえる（全角英数・全角空白・｜／など） */
const nfkc = (s: string) => s.normalize('NFKC')

/**
 * コード記号 1 つを、アプリのコードパーサが読める形に直す。
 * 読めないときは null。N.C. は 'N.C.' を返す。
 */
export function normalizeChordSymbol(raw: string): string | null {
  let s = joinSplitTokens(nfkc(raw).trim().replace(/[,、。]+$/, ''))
  const wrapped = /^[(\[]([^()[\]]+)[)\]]$/.exec(s)
  if (wrapped) s = wrapped[1].trim()
  if (isNoChord(s)) return 'N.C.'
  // 括弧の対応が取れないもの（F) や C7(b9）は、残骸を読み捨てず不正とする
  if (s.split('(').length !== s.split(')').length) return null

  s = s.replace(/♭/g, 'b').replace(/♯/g, '#')
  // onコード: C onE / C(onE) / ConE → C/E
  s = s.replace(/\(?[oO][nN]\s*([A-G][#b]?)\)?$/, '/$1')
  s = s.replace(/6\/9/, '6add9')
  // ø φ → m7b5、° → dim
  s = s.replace(/[øØφΦ]7?/, 'm7b5').replace(/°(7?)/, 'dim$1')
  // △ Δ → maj7（数字が続けば maj9 など）
  s = s.replace(/[△Δ](?!\d)/g, 'maj7').replace(/[△Δ]/g, 'maj')
  // maj の表記揺れと M7
  s = s.replace(/maj/gi, 'maj').replace(/M(?=\d)/g, 'maj')
  // -5 → b5
  s = s.replace(/-5/g, 'b5')
  // 括弧つきの 9 など: C(9) → Cadd9、C7(9) → C9
  s = s.replace(/^([A-G][#b]?(?:m|min)?)\((9|11|13)\)$/, '$1add$2')
  s = s.replace(/^([A-G][#b]?(?:m|maj|min)?)7\(9\)$/, '$19')
  s = s.replace(/[(),]/g, '')

  return parseChord(s).ok ? s : null
}

/** コードらしい書き方（ルート + 記号）なのに読めないもの、を見分ける材料 */
const CHORDISH = /^[A-G][#b]?[A-Za-z0-9#+\-()/△Δøφ°]*$/
const CHORD_SYNTAX = /[0-9#+()△Δøφ°]/

const FLAT_OF: Record<string, string> = { D: 'Eb', G: 'Ab', A: 'Bb' }

const isHold = (t: string) => t === '%' || t === '-'

type Tok =
  | { kind: 'bar' }
  | { kind: 'hold'; text: string }
  | { kind: 'chord'; text: string; symbol: string }
  | { kind: 'unknown'; text: string }

/**
 * 空白や括弧で分かれた onコード・括弧テンションを、1 つのトークンにつなぐ。
 * D♭ on F / D♭(on F) / D♭ (onF) → D♭/F、C (add9) / Dm7 (b5) → C(add9) / Dm7(b5)
 */
function joinSplitTokens(s: string): string {
  s = s.replace(/(\S)(?:\s*\(\s*|\s+)[oO][nN]\s*([A-G][#b♭♯]?)\s*\)?(?=\s|\||$)/g, '$1/$2')
  const tension = '(?:add)?[b#♭♯+-]?\\d{1,2}'
  const re = new RegExp(`(\\S)\\s*\\(\\s*(${tension}(?:\\s*,?\\s*${tension})*)\\s*\\)(?=\\s|\\||$)`, 'g')
  return s.replace(re, (_, pre: string, inner: string) => `${pre}(${inner.replace(/\s+/g, '')})`)
}

/** 行の前処理: 小節線の統一、onコードの結合 */
function prepareChordText(line: string): string {
  let s = nfkc(line)
  s = joinSplitTokens(s)
  s = s.replace(/:?\|+:?/g, ' | ')
  s = s.replace(/(^|\s)\/+(?=\s|$)/g, '$1|')
  return s
}

interface LineAnalysis {
  isChordLine: boolean
  toks: Tok[]
}

/** コード行かどうかの判定。トークンの大半がコードとして読める行だけをコード行とする */
function analyzeChordLine(line: string): LineAnalysis {
  const toks: Tok[] = []
  let ok = 0
  let unknown = 0
  let other = 0
  for (const text of prepareChordText(line).split(/\s+/)) {
    if (text === '') continue
    if (text === '|') {
      toks.push({ kind: 'bar' })
      continue
    }
    if (isHold(text)) {
      toks.push({ kind: 'hold', text })
      continue
    }
    const symbol = normalizeChordSymbol(text)
    if (symbol !== null) {
      toks.push({ kind: 'chord', text, symbol })
      ok++
      continue
    }
    const core = text.replace(/^[(\[]|[)\]]$/g, '')
    const unbalanced = /^\(?[A-G]/.test(text) && text.split('(').length !== text.split(')').length
    if (unbalanced) {
      toks.push({ kind: 'unknown', text })
      unknown++
    } else if (CHORDISH.test(core) && CHORD_SYNTAX.test(core.slice(1))) {
      toks.push({ kind: 'unknown', text: core })
      unknown++
    } else {
      other++
    }
  }
  const total = ok + unknown + other
  return { isChordLine: ok + unknown > 0 && (ok + unknown) / total >= 0.7, toks }
}

// ---------------------------------------------------------------- 見出し・繰り返し・カポ

const SECTION_WORDS = [
  'イントロ',
  'Intro(?:duction)?',
  '前奏',
  '[A-D]メロ',
  '大サビ',
  '落ちサビ',
  'ラスサビ',
  'サビ前',
  'サビ',
  '間奏',
  '後奏',
  'アウトロ',
  'Outro',
  'エンディング',
  'Ending',
  'Verse',
  'Pre-?Chorus',
  'Chorus',
  'Bridge',
  'ブリッジ',
  'Interlude',
  'Solo',
  'ソロ',
  'Hook',
  'Refrain',
  'Break',
  'ブレイク',
  'Coda',
  '\\d+番',
].join('|')
const WORD = `(?:${SECTION_WORDS})(?:\\s*\\d{1,2})?`
const MARKS = '[●■◆▼▶★☆※・\\s]*'
const BRACKETED_HEADING = new RegExp(`^${MARKS}([\\[【(])\\s*([^\\[\\]【】()|]{1,24}?)\\s*[\\]】)]\\s*[:：]?\\s*(.*)$`)
const WORD_ONLY = new RegExp(`^${WORD}$`, 'i')
const PLAIN_HEADING = new RegExp(`^${MARKS}(${WORD})(?![A-Za-z])\\s*[:：]?\\s*(.*)$`, 'i')

const looksLikeChord = (s: string) => normalizeChordSymbol(s) !== null || (CHORDISH.test(s) && CHORD_SYNTAX.test(s.slice(1)))

/** 見出し行なら { name, rest }（rest は同じ行に続く本文） */
function parseHeading(line: string): { name: string; rest: string } | null {
  const b = BRACKETED_HEADING.exec(line)
  if (b) {
    const name = b[2].trim()
    if (WORD_ONLY.test(name)) return { name, rest: b[3] }
    // 知らない名前の [] / 【】 は、コードでなく、同じ行に本文がないときだけ見出しとみなす。
    // 丸括弧は (笑) や (x2) と区別できないので対象外
    if (b[1] !== '(' && b[3].trim() === '' && !looksLikeChord(name)) return { name, rest: '' }
    return null
  }
  const p = PLAIN_HEADING.exec(line)
  if (p) return { name: p[1].replace(/\s+/g, ' ').trim(), rest: p[2] }
  return null
}

/** 行末の繰り返し指定（×2 / x2 / (x2) / ×2回）を取り除く */
function splitRepeat(line: string): { body: string; repeat: number } {
  const m = /[\s(]*[×xX]\s*(\d{1,2})\s*(?:回|times)?\s*\)?\s*$/.exec(line)
  if (!m) return { body: line, repeat: 1 }
  const repeat = Number(m[1])
  if (repeat < 1 || repeat > 16) return { body: line, repeat: 1 }
  return { body: line.slice(0, m.index), repeat }
}

const CAPO = /^[\s[【(★☆●■◆▼*]*(?:capo|カポ(?:タスト)?)\s*[:=]?\s*(\d{1,2})/i

// ---------------------------------------------------------------- 本体

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export function importChords(input: string, options: Partial<ImportOptions> = {}): ImportResult {
  const opts = { ...DEFAULT_IMPORT_OPTIONS, ...options }
  const lines = nfkc(input).split(/\r?\n/)
  const warnings: string[] = []
  const warned = new Set<string>()
  const warn = (msg: string) => {
    if (!warned.has(msg)) {
      warned.add(msg)
      warnings.push(msg)
    }
  }

  const sections: ImportSection[] = []
  let cur: ImportSection = { name: '', bars: [] }
  const closeSection = () => {
    if (cur.bars.length > 0) sections.push(cur)
  }
  let chordCount = 0
  let capo: number | null = null
  /** 出力済みのコードがあるか（先頭の継続記号を捨てるため） */
  let hasChord = false

  const transposeByCapo = (symbol: string) => {
    if (!opts.capoTranspose || !capo || symbol === 'N.C.') return symbol
    const r = parseChord(symbol)
    if (!r.ok) return symbol
    const moved = transposeChord(r.value, capo).symbol
    // 元が # 表記でなければ、D# A# G# はコード譜で一般的な b 表記にする
    return symbol.includes('#') ? moved : moved.replace(/(^|\/)([DGA])#/g, (_, pre: string, n: string) => pre + FLAT_OF[n])
  }

  const blank = (i: number) => (lines[i] ?? '').trim() === ''

  /** コード行・インライン行から小節を作る。何も取れなければ null */
  const barsFromLine = (body: string): string[][] | null => {
    let toks: Tok[] = []
    const analysis = analyzeChordLine(body)
    if (analysis.isChordLine) {
      toks = analysis.toks
    } else {
      // インライン: [C]あいう[G]えお / (C)あいう
      const re = /\[\s*([^[\]]+?)\s*\]|\(\s*([^()[\]]+?)\s*\)/g
      let m: RegExpExecArray | null
      while ((m = re.exec(body))) {
        const inner = m[1] ?? m[2]
        const symbol = normalizeChordSymbol(inner)
        if (symbol !== null) toks.push({ kind: 'chord', text: inner, symbol })
        else if (CHORDISH.test(inner) && CHORD_SYNTAX.test(inner.slice(1))) toks.push({ kind: 'unknown', text: inner })
      }
      if (!toks.some((t) => t.kind === 'chord')) {
        for (const t of toks) if (t.kind === 'unknown') warn(`「${t.text}」はコードとして解釈できないためスキップしました`)
        return null
      }
    }

    // 出力する記号の列にする。読めないコードは警告してスキップ
    type Item = { text: string; hold: boolean } | 'bar'
    const items: Item[] = []
    for (const t of toks) {
      if (t.kind === 'bar') items.push('bar')
      else if (t.kind === 'hold') items.push({ text: t.text, hold: true })
      else if (t.kind === 'chord') items.push({ text: transposeByCapo(t.symbol), hold: false })
      else warn(`「${t.text}」はコードとして解釈できないためスキップしました`)
    }
    const chordsInLine = items.filter((x) => x !== 'bar' && !x.hold).length
    if (chordsInLine === 0) return null

    const barred = items.includes('bar')
    const bars: string[][] = []
    const pushBar = (tokens: string[]) => {
      if (tokens.length === 0) return
      for (const part of chunk(tokens, MAX_PER_BAR)) bars.push(part)
      if (tokens.length > MAX_PER_BAR) warn(`1 小節に ${MAX_PER_BAR + 1} 個以上のコードがあったため、小節を分けました`)
    }

    if (barred) {
      let curBar: string[] = []
      for (const it of items) {
        if (it === 'bar') {
          pushBar(curBar)
          curBar = []
        } else curBar.push(it.text)
      }
      pushBar(curBar)
    } else {
      const k = opts.chordsPerBar === 'auto' ? (chordsInLine <= 4 ? 1 : 2) : opts.chordsPerBar
      // 継続記号は直前のコードにくっつけてから、コード単位で小節に割る
      const groups: string[][] = []
      for (const it of items) {
        if (it === 'bar') continue
        if (it.hold && groups.length > 0) groups[groups.length - 1].push(it.text)
        else if (!it.hold) groups.push([it.text])
      }
      for (const g of chunk(groups, k)) pushBar(g.flat())
    }

    // 先頭の継続記号（直前のコードがない）は捨てる
    if (!hasChord && bars.length > 0) {
      const first = bars[0]
      while (first.length > 0 && isHold(first[0])) first.shift()
      if (first.length === 0) bars.shift()
    }

    const count = items.filter((x) => x !== 'bar' && !x.hold && x.text !== 'N.C.').length
    chordCount += count
    if (bars.length > 0) hasChord = true
    return bars
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim()
    if (line === '') continue

    const capoMatch = CAPO.exec(line)
    if (capoMatch) {
      const n = Number(capoMatch[1])
      if (n >= 1 && n <= 11 && capo === null) {
        capo = n
        warn(
          opts.capoTranspose
            ? `カポ ${n} の表記があったため、コードを +${n} 半音移調して実音にしました`
            : `カポ ${n} の表記があります。コードはカポを付けたときの押さえ方のままです（実音にするには「カポぶん移調」をオン）`,
        )
      }
      continue
    }

    // 見出し
    let heading = parseHeading(line)
    if (!heading && /^[A-C]$/.test(line) && (i === 0 || blank(i - 1))) {
      // 1 文字だけの見出し（A / B / C）。コード 1 個だけの行と区別するため、
      // 次の行が複数コード（または小節線）のコード行のときだけ見出しとみなす
      const next = lines[i + 1] ?? ''
      const a = analyzeChordLine(next)
      if (a.isChordLine && (a.toks.length >= 2 || a.toks.some((t) => t.kind === 'bar'))) heading = { name: line, rest: '' }
    }
    if (heading) {
      closeSection()
      cur = { name: heading.name, bars: [] }
      line = heading.rest.trim()
      if (line === '') continue
    }

    const { body, repeat } = splitRepeat(line)
    const bars = barsFromLine(body)
    if (!bars) continue
    for (let r = 0; r < repeat; r++) for (const b of bars) cur.bars.push(b.join(' '))
  }
  closeSection()

  if (chordCount === 0) warn('コードが見つかりませんでした。コード譜をそのままコピーして貼り付けてください')

  const out: string[] = []
  for (const sec of sections) {
    const lns: string[] = []
    if (sec.name !== '') lns.push(`# ${sec.name}`)
    for (const row of chunk(sec.bars, 4)) lns.push(`| ${row.join(' | ')} |`)
    out.push(lns.join('\n'))
  }
  return { text: out.join('\n\n'), sections, warnings, chordCount, capo }
}
