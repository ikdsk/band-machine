import { describe, expect, it } from 'vitest'
import { importChords, normalizeChordSymbol } from './importChords'
import { parseProgression } from './progression'

/** 取り込み結果の進行テキストが、アプリの進行パーサでエラーなく読めること */
function expectParsable(text: string) {
  const { errors } = parseProgression(text)
  expect(errors).toEqual([])
}

describe('normalizeChordSymbol: 記号の正規化', () => {
  const cases: [string, string][] = [
    ['Ｃ', 'C'],
    ['Ａｍ７', 'Am7'],
    ['B♭', 'Bb'],
    ['F♯m', 'F#m'],
    ['C△7', 'Cmaj7'],
    ['CΔ7', 'Cmaj7'],
    ['C△', 'Cmaj7'],
    ['CM7', 'Cmaj7'],
    ['CMaj7', 'Cmaj7'],
    ['CMAJ7', 'Cmaj7'],
    ['CmM7', 'Cmmaj7'],
    ['Cø', 'Cm7b5'],
    ['Cφ7', 'Cm7b5'],
    ['Cm7(♭5)', 'Cm7b5'],
    ['Cm7(b5)', 'Cm7b5'],
    ['Cm7-5', 'Cm7b5'],
    ['C(9)', 'Cadd9'],
    ['C7(9)', 'C9'],
    ['Cm7(9)', 'Cm9'],
    ['C7(♭9)', 'C7b9'],
    ['C7(b9,#11)', 'C7b9#11'],
    ['Cadd9', 'Cadd9'],
    ['ConE', 'C/E'],
    ['C(onE)', 'C/E'],
    ['D/F♯', 'D/F#'],
    ['N.C.', 'N.C.'],
    ['NC', 'N.C.'],
    ['C7sus4', 'C7sus4'],
    ['Cdim7', 'Cdim7'],
    ['C°7', 'Cdim7'],
    ['Caug', 'Caug'],
    ['C+', 'C+'],
    ['C6/9', 'C6add9'],
    ['(Am)', 'Am'],
  ]
  it.each(cases)('%s → %s', (raw, expected) => {
    expect(normalizeChordSymbol(raw)).toBe(expected)
    expect(parseChordOk(expected)).toBe(true)
  })

  it('読めない記号は null', () => {
    expect(normalizeChordSymbol('Cxyz')).toBeNull()
    expect(normalizeChordSymbol('Hello')).toBeNull()
    expect(normalizeChordSymbol('Cadd#11omit3')).toBeNull()
  })
})

function parseChordOk(sym: string) {
  return sym === 'N.C.' || parseProgression(`| ${sym} |`).errors.length === 0
}

describe('onコード（空白あり）', () => {
  it.each([
    ['C onE', 'C/E'],
    ['C on E', 'C/E'],
    ['Am on G', 'Am/G'],
    ['C (onE)', 'C/E'],
  ])('%s → %s', (src, sym) => {
    expect(importChords(`| ${src} | G |`).text).toBe(`| ${sym} | G |`)
  })
})

describe('importChords: コード行＋歌詞行', () => {
  it('コード行だけを取り出し、歌詞行は無視する', () => {
    const r = importChords(['C       G', 'あいうえお かきくけこ', 'Am      F', 'さしすせそ たちつてと'].join('\n'))
    expect(r.text).toBe('| C | G | Am | F |')
    expect(r.chordCount).toBe(4)
    expect(r.warnings).toEqual([])
    expectParsable(r.text)
  })

  it('英語の歌詞行をコードと誤認しない', () => {
    const r = importChords(['C        G', 'I am a man', 'Am I', 'Am       F', 'And Dad Be A Bad Egg'].join('\n'))
    expect(r.text).toBe('| C | G | Am | F |')
  })

  it('Am を含む英語歌詞（大半が単語）は歌詞扱い', () => {
    const r = importChords('Am I the one\nC G')
    expect(r.text).toBe('| C | G |')
  })

  it('1 文字の A だけの行もコード行（直後が歌詞のとき）', () => {
    const r = importChords('A\nあいうえお\nE\nかきくけこ')
    expect(r.text).toBe('| A | E |')
  })

  it('コードが 1 つもなければ警告', () => {
    const r = importChords('あいうえお\nかきくけこ')
    expect(r.chordCount).toBe(0)
    expect(r.text).toBe('')
    expect(r.warnings.length).toBeGreaterThan(0)
  })

  it('改行コード CRLF と全角空白', () => {
    const r = importChords('Ｃ　Ｇ\r\nあいう\r\nＡｍ　Ｆ')
    expect(r.text).toBe('| C | G | Am | F |')
  })
})

describe('importChords: インライン', () => {
  it('[C]あいう[G]えお 形式', () => {
    const r = importChords('[C]あいう[G]えお\n[Am]かきく[F]けこ')
    expect(r.text).toBe('| C | G | Am | F |')
    expect(r.chordCount).toBe(4)
  })

  it('(C) 形式と、コードでない括弧（笑）は無視', () => {
    const r = importChords('(C)あいう(笑)(G)えお')
    expect(r.text).toBe('| C | G |')
  })

  it('括弧内の記号も正規化される', () => {
    const r = importChords('[B♭△7]あいう[Ｇm7(♭5)]えお')
    expect(r.text).toBe('| Bbmaj7 | Gm7b5 |')
    expectParsable(r.text)
  })

  it('読めないインラインコードは警告してスキップ', () => {
    const r = importChords('[C]あいう[Cadd#11omit3]えお[G]かき')
    expect(r.text).toBe('| C | G |')
    expect(r.warnings.some((w) => w.includes('Cadd#11omit3'))).toBe(true)
  })
})

describe('importChords: 小節線', () => {
  it.each([
    ['| C G | Am F |'],
    ['｜C G｜Am F｜'],
    ['C G / Am F /'],
    ['|| C G || Am F ||'],
    ['|: C G | Am F :|'],
  ])('%s → 2 小節', (line) => {
    const r = importChords(line)
    expect(r.text).toBe('| C G | Am F |')
    expectParsable(r.text)
  })

  it('小節線があるとオプションより小節線を優先する', () => {
    const r = importChords('| C | G | Am | F |', { chordsPerBar: 2 })
    expect(r.text).toBe('| C | G | Am | F |')
  })

  it('分数コードの / は小節線と区別する', () => {
    const r = importChords('| C/E G | Am/G F |')
    expect(r.text).toBe('| C/E G | Am/G F |')
  })

  it('5 個以上のコードがある小節は分割して警告', () => {
    const r = importChords('| C D E F G |')
    expect(r.text).toBe('| C D E F | G |')
    expect(r.warnings).toHaveLength(1)
    expectParsable(r.text)
  })

  it('継続記号 - % を保つ。先頭の継続記号は捨てる', () => {
    expect(importChords('| C - G - |').text).toBe('| C - G - |')
    expect(importChords('| - C |').text).toBe('| C |')
  })
})

describe('importChords: 記号の正規化と警告', () => {
  it('N.C. と各種記号を含む行', () => {
    const r = importChords('| C△7 Aø | D♭aug N.C. | G7sus4 Edim7 | Bm7(♭5) C onE |')
    expect(r.text).toBe('| Cmaj7 Am7b5 | Dbaug N.C. | G7sus4 Edim7 | Bm7b5 C/E |')
    expect(r.chordCount).toBe(7)
    expectParsable(r.text)
  })

  it('アプリが解釈できない記号は警告してスキップ', () => {
    const r = importChords('| C G7b9omit3 Am |')
    expect(r.text).toBe('| C Am |')
    expect(r.warnings.some((w) => w.includes('G7b9omit3'))).toBe(true)
  })

  it('同じ警告は 1 回だけ', () => {
    const r = importChords('| C G7b9omit3 |\n| C G7b9omit3 |')
    expect(r.warnings.filter((w) => w.includes('G7b9omit3'))).toHaveLength(1)
  })
})

describe('importChords: セクション', () => {
  const song = [
    '[Aメロ]',
    'C   G',
    'ダミーの歌詞です',
    '【サビ】',
    'Am  F',
    'ダミーの歌詞です',
  ].join('\n')

  it('見出しをセクション名として保持し、コメント行つきで出力する', () => {
    const r = importChords(song)
    expect(r.sections.map((s) => s.name)).toEqual(['Aメロ', 'サビ'])
    expect(r.text).toBe('# Aメロ\n| C | G |\n\n# サビ\n| Am | F |')
    const chart = parseProgression(r.text)
    expect(chart.errors).toEqual([])
    expect(chart.bars.map((b) => b.section)).toEqual(['Aメロ', undefined, 'サビ', undefined])
  })

  it.each([
    ['Intro', 'Intro'],
    ['[Verse 1]', 'Verse 1'],
    ['Chorus:', 'Chorus'],
    ['サビ:', 'サビ'],
    ['●Bメロ', 'Bメロ'],
    ['【間奏】', '間奏'],
    ['[ブリッジ]', 'ブリッジ'],
    ['Pre-Chorus', 'Pre-Chorus'],
  ])('見出し %s', (head, name) => {
    const r = importChords(`${head}\n| C | G |`)
    expect(r.sections[0].name).toBe(name)
  })

  it('見出しと同じ行にコードが続く（サビ: | C G |）', () => {
    const r = importChords('サビ: | C G | Am F |')
    expect(r.sections).toEqual([{ name: 'サビ', bars: ['C G', 'Am F'] }])
  })

  it('1 文字の見出し A / B（次が複数コードの行のとき）', () => {
    const r = importChords('A\nC G Am F\n\nB\nDm G\n')
    expect(r.sections.map((s) => s.name)).toEqual(['A', 'B'])
  })

  it('見出しの前のコードは名前なしセクション', () => {
    const r = importChords('| C |\n[サビ]\n| G |')
    expect(r.sections.map((s) => s.name)).toEqual(['', 'サビ'])
    expect(r.text).toBe('| C |\n\n# サビ\n| G |')
  })

  it('[C] のようなコード 1 つの行は見出しにしない', () => {
    const r = importChords('[C]あいう[G]えお\n[Am]')
    expect(r.sections).toHaveLength(1)
    expect(r.sections[0].name).toBe('')
    expect(r.chordCount).toBe(3)
  })

  it('コードのないセクションは出力しない', () => {
    const r = importChords('[Aメロ]\n歌詞だけ\n[サビ]\n| C |')
    expect(r.sections.map((s) => s.name)).toEqual(['サビ'])
  })
})

describe('importChords: 繰り返し', () => {
  it.each(['| C G | Am F | ×2', '| C G | Am F | x2', '| C G | Am F | (x2)', '| C G | Am F | ×2回', '| C G | Am F |x2'])(
    '%s → 行を 2 回',
    (line) => {
      const r = importChords(line)
      expect(r.text).toBe('| C G | Am F | C G | Am F |')
    },
  )

  it('コード行（小節線なし）の ×2', () => {
    const r = importChords('C G x2')
    expect(r.text).toBe('| C | G | C | G |')
  })

  it('指定した行だけが繰り返される', () => {
    const r = importChords('C G ×2\nAm F')
    expect(r.text).toBe('| C | G | C | G |\n| Am | F |')
  })

  it('×1 は 1 回、17 回以上は繰り返し指定とみなさない', () => {
    expect(importChords('| C | ×1').text).toBe('| C |')
    expect(importChords('| C G | Am F | x99').text).toBe('| C G | Am F |')
  })
})

describe('importChords: 1 小節あたりのコード数', () => {
  const line = 'C G Am F Dm Em F G'
  it('1 コード 1 小節', () => {
    expect(importChords('C G Am F', { chordsPerBar: 1 }).text).toBe('| C | G | Am | F |')
  })
  it('2 コード 1 小節', () => {
    expect(importChords('C G Am F', { chordsPerBar: 2 }).text).toBe('| C G | Am F |')
  })
  it('余りは最後の小節', () => {
    expect(importChords('C G Am', { chordsPerBar: 2 }).text).toBe('| C G | Am |')
  })
  it('自動: 4 コード以下は 1 コード 1 小節', () => {
    expect(importChords('C G Am F').text).toBe('| C | G | Am | F |')
  })
  it('自動: 5 コード以上は 2 コード 1 小節', () => {
    expect(importChords(line).text).toBe('| C G | Am F | Dm Em | F G |')
  })
  it('自動の判定は行ごと', () => {
    expect(importChords('C G\nC G Am F Dm').text).toBe('| C | G | C G | Am F |\n| Dm |')
  })
})

describe('importChords: カポ', () => {
  const src = 'Capo 2\n| C G | Am F |'
  it.each(['Capo 2', 'Capo: 2', 'カポ2', 'カポ 2', '【カポ2】', 'Ｃａｐｏ　２'])('%s を検出して警告（既定は移調しない）', (cap) => {
    const r = importChords(`${cap}\n| C G | Am F |`)
    expect(r.capo).toBe(2)
    expect(r.text).toBe('| C G | Am F |')
    expect(r.warnings.some((w) => w.includes('カポ'))).toBe(true)
  })

  it('移調オプションで実音に直す', () => {
    const r = importChords(src, { capoTranspose: true })
    expect(r.text).toBe('| D A | Bm G |')
    expect(r.capo).toBe(2)
    expectParsable(r.text)
  })

  it('分数コード・フラット系も移調する', () => {
    const r = importChords('カポ3\n| C/E Bb |', { capoTranspose: true })
    expect(r.text).toBe('| Eb/G Db |')
  })

  it('N.C. はそのまま', () => {
    expect(importChords('Capo 1\n| N.C. C |', { capoTranspose: true }).text).toBe('| N.C. C# |')
  })

  it('カポの行自体はコードとして扱わない', () => {
    expect(importChords('Capo 2').chordCount).toBe(0)
  })
})

describe('importChords: 出力', () => {
  it('4 小節ごとに改行する', () => {
    const r = importChords('| C | G | Am | F | Dm | Em |')
    expect(r.text).toBe('| C | G | Am | F |\n| Dm | Em |')
  })

  it('ダミー歌詞つきの実用的なコード譜', () => {
    const song = [
      'Capo 1',
      '[Intro]',
      '| C | G | Am | F |',
      '',
      '[Aメロ]',
      'C        G',
      'ダミーの歌詞をここに',
      'Am       F',
      'ダミーの歌詞をここに',
      '',
      '[サビ]',
      '[F]ダミーの[G]歌詞が[Em]ここに[Am]入る',
      '| F G | Em Am | ×2',
    ].join('\n')
    const r = importChords(song)
    expect(r.sections.map((s) => s.name)).toEqual(['Intro', 'Aメロ', 'サビ'])
    expect(r.sections[2].bars).toEqual(['F', 'G', 'Em', 'Am', 'F G', 'Em Am', 'F G', 'Em Am'])
    expect(r.capo).toBe(1)
    expectParsable(r.text)
  })
})

describe('空白入りの onコード・括弧テンション（コード行内）', () => {
  it('D♭(on F)  Dm7(♭5)  G7sus4', () => {
    const r = importChords('D♭(on F)  Dm7(♭5)  G7sus4')
    expect(r.text).toBe('| Db/F | Dm7b5 | G7sus4 |')
    expect(r.warnings).toEqual([])
  })

  it.each(['D♭ on F', 'D♭ (on F)', 'D♭(on F)', 'D♭(onF)', 'D♭( on F )', 'D♭（on F）', 'D♭　（ｏｎ　Ｆ）', 'D♭ onF'])(
    '%s → Db/F（単体・行内とも）',
    (src) => {
      expect(normalizeChordSymbol(src)).toBe('Db/F')
      expect(importChords(`${src}  G  Am`).text).toBe('| Db/F | G | Am |')
    },
  )

  it.each([
    ['C(9)', 'Cadd9'],
    ['C (9)', 'Cadd9'],
    ['C( 9 )', 'Cadd9'],
    ['Dm7 (♭5)', 'Dm7b5'],
    ['Dm7(♭5)', 'Dm7b5'],
    ['C7(#9)', 'C7#9'],
    ['C7 (#9)', 'C7#9'],
    ['C (add9)', 'Cadd9'],
    ['C7 (b9, #11)', 'C7b9#11'],
  ])('%s → %s', (src, sym) => {
    expect(importChords(`${src}  G  Am`).text).toBe(`| ${sym} | G | Am |`)
  })

  it('括弧の残骸は別のコードに化けさせず、警告してスキップ', () => {
    expect(normalizeChordSymbol('F)')).toBeNull()
    expect(normalizeChordSymbol('C7(b9')).toBeNull()
    const r = importChords('D♭(on  G7  Am')
    expect(r.text).toBe('| G7 | Am |')
    expect(r.warnings.some((w) => w.includes('D♭(on') || w.includes('Db(on'))).toBe(true)
    const r2 = importChords('C  F)  G  Am')
    expect(r2.text).toBe('| C | G | Am |')
    expect(r2.warnings.some((w) => w.includes('F)'))).toBe(true)
  })

  it('単独の (G) は括弧つきコードのまま（テンションと混同しない）', () => {
    expect(importChords('C (G) Am').text).toBe('| C | G | Am |')
  })
})
