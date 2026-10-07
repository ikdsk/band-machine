import { describe, expect, it } from 'vitest'
import { ALL_VARIANTS, GENRES, getVariant } from '../styles'
import { stepsPerBeat } from '../styles/types'
import { steps } from '../styles/pattern'
import { arrange } from './arrange'
import { autoFillBars, fillHits, fillStart } from './fills'
import { parseProgression } from './progression'
import type { DrumEvent, NoteEvent, PartId, PitchedEvent } from './types'
import { BASS_RANGE, GUITAR_RANGE, KEYS_RANGE } from './voicing'

const chart = (text: string, bpb = 4) => parseProgression(text, bpb)
const PROG = '| C | G | Am | F |'

function of(events: NoteEvent[], part: 'drums'): DrumEvent[]
function of(events: NoteEvent[], part: 'bass' | 'guitar' | 'keys'): PitchedEvent[]
function of(events: NoteEvent[], part: PartId): NoteEvent[]
function of(events: NoteEvent[], part: PartId): NoteEvent[] {
  return events.filter((e) => e.part === part)
}
const inBar = (events: NoteEvent[], bar: number) => events.filter((e) => e.time.bar === bar)
const sig = (events: NoteEvent[]) =>
  events.map((e) => `${e.time.beat}:${e.time.sixteenth}:${'drum' in e ? e.drum : e.pitches.join(',')}`).join('|')
const pos = (e: NoteEvent) => e.time.beat * 4 + e.time.sixteenth

describe('スタイル定義データ', () => {
  it('ジャンル数・バリエーション数が仕様を満たす', () => {
    const ids = GENRES.map((g) => g.id)
    for (const id of ['rock', 'anime', 'ballad', 'pop', 'funk', 'blues', 'jazz', 'bossa', 'reggae', 'metal']) {
      expect(ids).toContain(id)
    }
    expect(GENRES.find((g) => g.id === 'rock')!.variants).toHaveLength(4)
    expect(GENRES.find((g) => g.id === 'anime')!.variants).toHaveLength(3)
    expect(GENRES.find((g) => g.id === 'ballad')!.variants).toHaveLength(3)
    expect(new Set(ALL_VARIANTS.map((v) => v.id)).size).toBe(ALL_VARIANTS.length)
  })

  it('すべてのパターン文字列の長さが1小節ぶん（4拍×拍あたりステップ数）', () => {
    for (const v of ALL_VARIANTS) {
      const len = (g: 'sixteenth' | 'triplet') => 4 * stepsPerBeat(g)
      for (const [piece, row] of Object.entries(v.drums.rows)) {
        expect(steps(row!).length, `${v.id} drums.${piece}`).toBe(len(v.drums.grid))
      }
      if (v.bass.kind === 'pattern') expect(steps(v.bass.steps).length, `${v.id} bass`).toBe(len(v.bass.grid))
      expect(steps(v.guitar.steps).length, `${v.id} guitar`).toBe(len(v.guitar.grid))
      if (v.keys) expect(steps(v.keys.steps).length, `${v.id} keys`).toBe(len(v.keys.grid))
    }
  })
})

describe('arrange: ジャンルごとにイベントが生成される', () => {
  for (const v of ALL_VARIANTS) {
    it(`${v.id}: ドラム・ベース・ギターのイベントが全小節にある`, () => {
      const ev = arrange({ chart: chart(PROG), variant: v, beatsPerBar: 4 })
      for (let bar = 0; bar < 4; bar++) {
        const e = inBar(ev, bar)
        expect(of(e, 'drums').length, `${v.id} bar${bar} drums`).toBeGreaterThan(0)
        expect(of(e, 'bass').length, `${v.id} bar${bar} bass`).toBeGreaterThan(0)
        expect(of(e, 'guitar').length, `${v.id} bar${bar} guitar`).toBeGreaterThan(0)
      }
    })

    it(`${v.id}: 音域内・時間が小節内・ベロシティが 0〜1`, () => {
      const ev = arrange({ chart: chart('| C Am | Dm7 G7 | Em/B A7b9 | F#m7b5 B7 |'), variant: v, beatsPerBar: 4 })
      for (const e of ev) {
        expect(e.velocity).toBeGreaterThan(0)
        expect(e.velocity).toBeLessThanOrEqual(1)
        expect(e.time.beat).toBeGreaterThanOrEqual(0)
        expect(e.time.beat).toBeLessThan(4)
        expect(e.time.sixteenth).toBeGreaterThanOrEqual(0)
        expect(e.time.sixteenth).toBeLessThan(4)
        expect(e.duration).toBeGreaterThan(0)
        if (e.part === 'bass') for (const p of e.pitches) expect(p).toBeGreaterThanOrEqual(BASS_RANGE[0]), expect(p).toBeLessThanOrEqual(BASS_RANGE[1])
        if (e.part === 'guitar') for (const p of e.pitches) expect(p).toBeGreaterThanOrEqual(36), expect(p).toBeLessThanOrEqual(GUITAR_RANGE[1])
        if (e.part === 'keys') for (const p of e.pitches) expect(p).toBeLessThanOrEqual(KEYS_RANGE[1])
      }
    })

    it(`${v.id}: 3/4 でもイベントが生成される`, () => {
      const ev = arrange({ chart: chart('| C | G | Am |', 3), variant: v, beatsPerBar: 3 })
      expect(of(ev, 'drums').length).toBeGreaterThan(0)
      expect(of(ev, 'bass').length).toBeGreaterThan(0)
      for (const e of ev) expect(e.time.beat).toBeLessThan(3)
    })
  }

  it('全パートを出力する（ミュートは再生層の責務）', () => {
    const ev = arrange({ chart: chart(PROG), variant: getVariant('ballad-piano'), beatsPerBar: 4 })
    const parts = new Set(ev.map((e) => e.part))
    expect(parts).toEqual(new Set(['drums', 'bass', 'guitar', 'keys']))
  })

  it('バリエーションごとにドラム・ベース・ギターのパターンが異なる', () => {
    const sigs = (part: PartId) =>
      ALL_VARIANTS.map((v) => sig(of(inBar(arrange({ chart: chart('| C | C | C | C |'), variant: v, beatsPerBar: 4 }), 1), part)))
    for (const part of ['drums', 'bass', 'guitar'] as PartId[]) {
      const s = sigs(part)
      const dup = s.map((x, i) => (s.indexOf(x) !== i ? ALL_VARIANTS[i].id + '=' + ALL_VARIANTS[s.indexOf(x)].id : '')).filter(Boolean)
      expect(dup, part).toEqual([])
    }
  })

  it('チャートが空ならイベントなし', () => {
    expect(arrange({ chart: chart(''), variant: getVariant('rock-8beat'), beatsPerBar: 4 })).toEqual([])
  })
})

describe('arrange: コードへの追従', () => {
  it('ロック8ビートのベースはルートを弾く（C, G, Am, F）', () => {
    const ev = arrange({ chart: chart(PROG), variant: getVariant('rock-8beat'), beatsPerBar: 4 })
    const firstPitch = (bar: number) => of(inBar(ev, bar), 'bass')[0].pitches[0] % 12
    expect([0, 1, 2, 3].map(firstPitch)).toEqual([0, 7, 9, 5])
  })

  it('1小節に2コードなら、後半のベースは後半のコードのルート', () => {
    const ev = arrange({ chart: chart('| C G |'), variant: getVariant('rock-8beat'), beatsPerBar: 4 })
    const bass = of(ev, 'bass')
    expect(bass.filter((e) => pos(e) < 8).every((e) => e.pitches[0] % 12 === 0)).toBe(true)
    expect(bass.filter((e) => pos(e) >= 8).every((e) => e.pitches[0] % 12 === 7)).toBe(true)
  })

  it('コードの切れ目をまたいで音が伸びない', () => {
    const ev = arrange({ chart: chart('| C G |'), variant: getVariant('ballad-piano'), beatsPerBar: 4 })
    for (const e of of(ev, 'guitar')) expect(pos(e) + e.duration).toBeLessThanOrEqual(pos(e) < 8 ? 8 : 16)
  })

  it('分数コードはベースがベース音', () => {
    const ev = arrange({ chart: chart('| C/E |'), variant: getVariant('rock-8beat'), beatsPerBar: 4 })
    expect(of(ev, 'bass')[0].pitches[0] % 12).toBe(4)
  })

  it('N.C. の小節ではピッチ系が鳴らずドラムは鳴る', () => {
    const ev = arrange({ chart: chart('| C | N.C. |'), variant: getVariant('rock-8beat'), beatsPerBar: 4 })
    const b1 = inBar(ev, 1)
    expect(of(b1, 'bass')).toHaveLength(0)
    expect(of(b1, 'guitar')).toHaveLength(0)
    expect(of(b1, 'drums').length).toBeGreaterThan(0)
  })

  it('コードが1つの小節でも途中のコード頭には必ず音が出る（発音のないコードの救済）', () => {
    const ev = arrange({ chart: chart('| C G |'), variant: getVariant('anime-fourfloor'), beatsPerBar: 4 })
    expect(of(ev, 'bass').some((e) => pos(e) >= 8)).toBe(true)
  })

  it('ジャズはウォーキング: 各拍に1音、小節末は次のルートの半音隣', () => {
    const ev = arrange({ chart: chart('| Dm7 | G7 | Cmaj7 | Cmaj7 |'), variant: getVariant('jazz-swing'), beatsPerBar: 4 })
    const bass0 = of(inBar(ev, 0), 'bass')
    expect(bass0.map(pos)).toEqual([0, 4, 8, 12])
    expect(bass0[0].pitches[0] % 12).toBe(2)
    const approach = bass0[3].pitches[0] % 12
    expect([6, 8]).toContain(approach) // G(7) の半音下 F# か半音上 G#
    const bass1 = of(inBar(ev, 1), 'bass')
    expect(bass1[0].pitches[0] % 12).toBe(7)
  })
})

describe('arrange: フィル', () => {
  const v = getVariant('rock-8beat')
  const base = arrange({ chart: chart(PROG), variant: v, beatsPerBar: 4 })

  it('フィル指定小節でドラムパターンが変わり、他の小節は変わらない', () => {
    const ev = arrange({ chart: chart(PROG), variant: v, beatsPerBar: 4, fills: { 3: 'toms' } })
    expect(sig(of(inBar(ev, 3), 'drums'))).not.toBe(sig(of(inBar(base, 3), 'drums')))
    expect(sig(of(inBar(ev, 1), 'drums'))).toBe(sig(of(inBar(base, 1), 'drums')))
    expect(sig(of(inBar(ev, 2), 'drums'))).toBe(sig(of(inBar(base, 2), 'drums')))
  })

  it('タム回しにはタムが含まれ、フィル前（前半2拍）は通常パターンのまま', () => {
    const ev = arrange({ chart: chart(PROG), variant: v, beatsPerBar: 4, fills: { 3: 'toms' } })
    const d = of(inBar(ev, 3), 'drums') as Extract<NoteEvent, { part: 'drums' }>[]
    expect(d.some((e) => e.drum.startsWith('tom'))).toBe(true)
    const before = (xs: NoteEvent[]) => sig(xs.filter((e) => pos(e) < fillStart('toms', 4)))
    expect(before(d)).toBe(before(of(inBar(base, 3), 'drums')))
    // フィル区間にハイハットは残らない
    expect(d.filter((e) => pos(e) >= 8).some((e) => e.drum === 'hat')).toBe(false)
  })

  it('スネア連打はスネアが後半2拍に16分で並ぶ', () => {
    const ev = arrange({ chart: chart(PROG), variant: v, beatsPerBar: 4, fills: { 3: 'snare' } })
    const sn = (of(inBar(ev, 3), 'drums') as Extract<NoteEvent, { part: 'drums' }>[]).filter((e) => e.drum === 'snare' && pos(e) >= 8)
    expect(sn.map(pos)).toEqual([8, 9, 10, 11, 12, 13, 14, 15])
  })

  it('シンプルは最後の拍だけが変わる', () => {
    const ev = arrange({ chart: chart(PROG), variant: v, beatsPerBar: 4, fills: { 3: 'simple' } })
    const before = (xs: NoteEvent[]) => sig(xs.filter((e) => pos(e) < 12))
    expect(before(of(inBar(ev, 3), 'drums'))).toBe(before(of(inBar(base, 3), 'drums')))
    expect(sig(of(inBar(ev, 3), 'drums'))).not.toBe(sig(of(inBar(base, 3), 'drums')))
  })

  it('自動（ジャンル既定）はそのジャンルの既定フィルになる', () => {
    const auto = arrange({ chart: chart(PROG), variant: v, beatsPerBar: 4, fills: { 3: 'auto' } })
    const toms = arrange({ chart: chart(PROG), variant: v, beatsPerBar: 4, fills: { 3: 'toms' } })
    expect(sig(of(inBar(auto, 3), 'drums'))).toBe(sig(of(inBar(toms, 3), 'drums')))
  })

  it('フィルの次の小節の頭にクラッシュ（4小節目フィル → 5小節目頭）', () => {
    const c = chart('| C | G | Am | F | C | G | Am | F |')
    const ev = arrange({ chart: c, variant: v, beatsPerBar: 4, fills: { 3: 'toms' } })
    const crash = (bar: number) =>
      (of(inBar(ev, bar), 'drums') as Extract<NoteEvent, { part: 'drums' }>[]).filter((e) => e.drum === 'crash' && pos(e) === 0)
    expect(crash(4)).toHaveLength(1)
    expect(crash(5)).toHaveLength(0)
    expect(crash(3)).toHaveLength(0)
  })

  it('クラッシュが元々ある小節で重複しない', () => {
    const c = chart('| C | G | Am | F | C |')
    const ev = arrange({ chart: c, variant: getVariant('rock-hard'), beatsPerBar: 4, fills: { 3: 'toms' } })
    const n = (of(inBar(ev, 4), 'drums') as Extract<NoteEvent, { part: 'drums' }>[]).filter((e) => e.drum === 'crash' && pos(e) === 0)
    expect(n).toHaveLength(1)
  })

  it('ブレイク: 他パートも1拍目のキメだけで止まる。次小節頭はクラッシュ', () => {
    const c = chart('| C | G | Am | F | C |')
    const ev = arrange({ chart: c, variant: getVariant('ballad-piano'), beatsPerBar: 4, fills: { 1: 'break' } })
    const b = inBar(ev, 1)
    for (const part of ['drums', 'bass', 'guitar', 'keys'] as PartId[]) {
      const p = of(b, part)
      expect(p.length, part).toBeGreaterThan(0)
      expect(p.every((e) => pos(e) === 0), part).toBe(true)
    }
    expect(of(b, 'bass')[0].pitches[0] % 12).toBe(7)
    const next = (of(inBar(ev, 2), 'drums') as Extract<NoteEvent, { part: 'drums' }>[]).filter((e) => e.drum === 'crash' && pos(e) === 0)
    expect(next).toHaveLength(1)
    // 他の小節は通常どおり鳴る
    expect(of(inBar(ev, 0), 'bass').length).toBeGreaterThan(0)
    expect(of(inBar(ev, 2), 'guitar').length).toBeGreaterThan(0)
  })

  it('4小節ごとの自動フィル（8小節 → 4・8小節目）', () => {
    const c = chart('| C | G | Am | F | C | G | Am | F |')
    const plain = arrange({ chart: c, variant: v, beatsPerBar: 4 })
    const ev = arrange({ chart: c, variant: v, beatsPerBar: 4, autoFill: 4 })
    const changed = [0, 1, 2, 3, 4, 5, 6, 7].filter(
      (b) => sig(of(inBar(ev, b), 'drums')) !== sig(of(inBar(plain, b), 'drums')),
    )
    // 3, 7 がフィル、4 はクラッシュ、0 はループしないので変わらない
    expect(changed).toEqual([3, 4, 7])
  })

  it('明示指定は自動フィルより優先', () => {
    const c = chart('| C | G | Am | F |')
    const ev = arrange({ chart: c, variant: v, beatsPerBar: 4, autoFill: 4, fills: { 3: 'snare' } })
    const only = arrange({ chart: c, variant: v, beatsPerBar: 4, fills: { 3: 'snare' } })
    expect(sig(of(inBar(ev, 3), 'drums'))).toBe(sig(of(inBar(only, 3), 'drums')))
  })

  it('3/4 でもフィルは小節末に収まる', () => {
    const ev = arrange({ chart: chart('| C | G |', 3), variant: v, beatsPerBar: 3, fills: { 1: 'toms' } })
    for (const e of inBar(ev, 1)) expect(pos(e)).toBeLessThan(12)
  })
})

describe('arrange: ループ範囲', () => {
  const c = chart('| C | G | Am | F | C | G | Am | F |')
  const v = getVariant('rock-8beat')

  it('範囲内の小節のイベントだけを出す（小節番号は絶対位置）', () => {
    const ev = arrange({ chart: c, variant: v, beatsPerBar: 4, range: { start: 2, end: 4 } })
    expect(new Set(ev.map((e) => e.time.bar))).toEqual(new Set([2, 3]))
  })

  it('範囲外を計算してもボイシングは全体と同じ（連続性）', () => {
    const all = arrange({ chart: c, variant: v, beatsPerBar: 4 })
    const part = arrange({ chart: c, variant: v, beatsPerBar: 4, range: { start: 2, end: 4 } })
    expect(sig(inBar(part, 2))).toBe(sig(inBar(all, 2)))
  })

  it('自動フィルは範囲の先頭から数える', () => {
    const ev = arrange({ chart: c, variant: v, beatsPerBar: 4, autoFill: 4, range: { start: 2, end: 6 } })
    const plain = arrange({ chart: c, variant: v, beatsPerBar: 4, range: { start: 2, end: 6 } })
    const changed = [2, 3, 4, 5].filter((b) => sig(of(inBar(ev, b), 'drums')) !== sig(of(inBar(plain, b), 'drums')))
    expect(changed).toEqual([5])
  })

  it('ループ時、末尾のフィルの後（ループ先頭）にクラッシュ', () => {
    const mk = (loop: boolean) =>
      arrange({ chart: c, variant: v, beatsPerBar: 4, loop, fills: { 3: 'toms' }, range: { start: 0, end: 4 } })
    const crash0 = (ev: NoteEvent[]) =>
      (of(inBar(ev, 0), 'drums') as Extract<NoteEvent, { part: 'drums' }>[]).filter((e) => e.drum === 'crash' && pos(e) === 0).length
    expect(crash0(mk(true))).toBe(1)
    expect(crash0(mk(false))).toBe(0)
  })

  it('範囲が不正でも丸められる', () => {
    const ev = arrange({ chart: c, variant: v, beatsPerBar: 4, range: { start: 6, end: 99 } })
    expect(new Set(ev.map((e) => e.time.bar))).toEqual(new Set([6, 7]))
  })
})

describe('fills', () => {
  it('autoFillBars: N 小節のまとまりの最後', () => {
    expect(autoFillBars(8, 4)).toEqual([3, 7])
    expect(autoFillBars(8, 8)).toEqual([7])
    expect(autoFillBars(12, 8)).toEqual([7])
    expect(autoFillBars(3, 4)).toEqual([])
    expect(autoFillBars(8, 0)).toEqual([])
    expect(autoFillBars(8, 4, 2)).toEqual([5])
  })

  it('フィルの発音は小節内に収まる', () => {
    for (const bpb of [3, 4]) {
      for (const k of ['toms', 'snare', 'simple'] as const) {
        for (const h of fillHits(k, bpb)) {
          expect(h.at).toBeGreaterThanOrEqual(0)
          expect(h.at).toBeLessThan(bpb * 4)
        }
      }
    }
  })
})
