// ジャンル×バリエーションのパターン定義（データ）。追加は GENRES に書き足すだけ。
import type { Genre, StyleVariant } from './types'

export * from './types'

type VariantInput = Omit<StyleVariant, 'genreId'>

function genre(id: string, name: string, variants: VariantInput[]): Genre {
  return { id, name, variants: variants.map((v) => ({ ...v, genreId: id })) }
}

export const GENRES: Genre[] = [
  genre('rock', 'ロック', [
    {
      id: 'rock-8beat',
      name: '8ビート',
      bpm: 120,
      description: '基本の8ビート。ハイハット8分、ベースは8分のルート弾き。',
      drums: {
        grid: 'sixteenth',
        fill: 'toms',
        rows: {
          hat: 'x.o.x.o.x.o.x.o.',
          kick: 'X.......x.x.....',
          snare: '....X.......X...',
        },
      },
      bass: { kind: 'pattern', grid: 'sixteenth', steps: 'X-x-x-x-x-x-x-x-' },
      guitar: { kind: 'strum', timbre: 'crunch', grid: 'sixteenth', steps: 'D-d-D-d-D-d-D-d-' },
    },
    {
      id: 'rock-16beat',
      name: '16ビート',
      bpm: 108,
      description: 'ハイハット16分。キックとベースが跳ねる。ギターは16分のストローク。',
      drums: {
        grid: 'sixteenth',
        fill: 'snare',
        rows: {
          hat: 'xoxoxoxoxoxoxoxo',
          kick: 'X..x..x...x.x...',
          snare: '....X..g....X..g',
        },
      },
      bass: { kind: 'pattern', grid: 'sixteenth', steps: 'X-xxX-xuX-xxX-xu' },
      guitar: { kind: 'strum', timbre: 'crunch', grid: 'sixteenth', steps: 'D-.u.udu D-.u.udu' },
    },
    {
      id: 'rock-hard',
      name: 'ハードロック',
      bpm: 132,
      description: '歪んだパワーコードのパームミュート刻み。ベースはルートの8分、シンバルでアクセント。',
      drums: {
        grid: 'sixteenth',
        fill: 'toms',
        rows: {
          hat: 'x.x.x.x.x.x.x.x.',
          crash: 'X...............',
          kick: 'X...x.x.X...x.x.',
          snare: '....X.......X...',
        },
      },
      bass: { kind: 'pattern', grid: 'sixteenth', steps: 'X-x-u-x-X-x-u-x-' },
      guitar: { kind: 'power', timbre: 'dist', grid: 'sixteenth', steps: 'X-p-p-p-X-p-p-p-' },
    },
    {
      id: 'rock-shuffle',
      name: 'シャッフル',
      bpm: 112,
      description: '3連のスウィング。長短の跳ねたリズム。ベースは 1-5-6-5 のブギー。',
      drums: {
        grid: 'triplet',
        fill: 'snare',
        rows: {
          hat: 'X.x x.x x.x x.x',
          kick: 'X.. ... x.. ...',
          snare: '... X.. ... X..',
        },
      },
      bass: { kind: 'pattern', grid: 'triplet', steps: 'X-x x-x f-f u-x' },
      guitar: { kind: 'strum', timbre: 'crunch', grid: 'triplet', steps: 'D-d D-d D-d D-d' },
    },
  ]),

  genre('anime', 'アニソン', [
    {
      id: 'anime-fast',
      name: '疾走系',
      bpm: 180,
      description: '速いテンポで駆け抜ける。小節頭クラッシュ、キックは細かく、ギターは8分ダウン。',
      drums: {
        grid: 'sixteenth',
        fill: 'snare',
        rows: {
          hat: 'x.x.x.x.x.x.x.x.',
          crash: 'X...............',
          kick: 'X.x...x.X.x...x.',
          snare: '....X.......X...',
        },
      },
      bass: { kind: 'pattern', grid: 'sixteenth', steps: 'X-x-x-x-X-x-x-xx' },
      guitar: { kind: 'strum', timbre: 'crunch', grid: 'sixteenth', steps: 'D-DuD-DuD-DuD-Du' },
      keys: { kind: 'comp', timbre: 'pad', grid: 'sixteenth', steps: 'o---------------' },
    },
    {
      id: 'anime-fourfloor',
      name: '4つ打ちポップ',
      bpm: 142,
      description: 'キック4つ打ち、オープンハットの裏打ち。ベースとシンセは裏拍。',
      drums: {
        grid: 'sixteenth',
        fill: 'simple',
        rows: {
          hat: 'o.o.o.o.o.o.o.o.',
          openHat: '..x...x...x...x.',
          kick: 'X...X...X...X...',
          snare: '....X.......X...',
        },
      },
      bass: { kind: 'pattern', grid: 'sixteenth', steps: '..x-..x-..x-..x-' },
      guitar: { kind: 'strum', timbre: 'clean', grid: 'sixteenth', steps: '..d-..d-..d-.ud-' },
      keys: { kind: 'comp', timbre: 'pad', grid: 'sixteenth', steps: '..x-..x-..x-..x-' },
    },
    {
      id: 'anime-halftime',
      name: 'ハーフテンポサビ',
      bpm: 160,
      description: 'スネアが3拍目に来るハーフタイム。ベースは伸ばし、広がりのあるサビ。',
      drums: {
        grid: 'sixteenth',
        fill: 'toms',
        rows: {
          hat: 'x.x.x.x.x.x.x.x.',
          crash: 'X...............',
          kick: 'X.....x.......x.',
          snare: '........X.......',
        },
      },
      bass: { kind: 'pattern', grid: 'sixteenth', steps: 'X-----x-X-----x-' },
      guitar: { kind: 'strum', timbre: 'crunch', grid: 'sixteenth', steps: 'D-------D-D-D-d-' },
      keys: { kind: 'comp', timbre: 'pad', grid: 'sixteenth', steps: 'x---------------' },
    },
  ]),

  genre('ballad', 'バラード', [
    {
      id: 'ballad-simple8',
      name: 'シンプル8分',
      bpm: 76,
      description: '控えめな8ビート。クロススティックのバックビート、ベースは2分音符中心、ギターは柔らかいストローク。',
      drums: {
        grid: 'sixteenth',
        fill: 'simple',
        rows: {
          hat: 'o.o.o.o.o.o.o.o.',
          kick: 'X.....x.X.......',
          rim: '....x.......x...',
        },
      },
      bass: { kind: 'pattern', grid: 'sixteenth', steps: 'X-------x-x-----' },
      guitar: { kind: 'strum', timbre: 'clean', grid: 'sixteenth', steps: 'D---d-d-D---d-d-' },
      keys: { kind: 'comp', timbre: 'piano', grid: 'sixteenth', steps: 'x-------x-------' },
    },
    {
      id: 'ballad-arpeggio',
      name: '6/8風アルペジオ',
      bpm: 66,
      description: '3連の6/8（12/8）フィール。ギターが分散和音。3/4でも使える。',
      drums: {
        grid: 'triplet',
        fill: 'simple',
        rows: {
          hat: 'xoo xoo xoo xoo',
          kick: 'X.. ... x.. ...',
          snare: '... o.. ... o..',
        },
      },
      bass: { kind: 'pattern', grid: 'triplet', steps: 'X-- --- x-- ---' },
      guitar: { kind: 'arpeggio', timbre: 'clean', grid: 'triplet', steps: '123 432 123 432' },
      keys: { kind: 'comp', timbre: 'pad', grid: 'triplet', steps: 'o-- --- --- ---' },
    },
    {
      id: 'ballad-piano',
      name: 'ピアノ伴奏風',
      bpm: 72,
      description: 'キーボードが左手ルート＋右手の8分アルペジオ。ドラムは最小限、ギターは薄く。',
      drums: {
        grid: 'sixteenth',
        fill: 'simple',
        rows: {
          kick: 'o.......o.......',
          rim: '....o.......o...',
        },
      },
      bass: { kind: 'pattern', grid: 'sixteenth', steps: 'X---------------' },
      guitar: { kind: 'strum', timbre: 'clean', grid: 'sixteenth', steps: 'd---------------' },
      keys: { kind: 'arpeggio', timbre: 'piano', grid: 'sixteenth', steps: '1-2-3-4-5-4-3-2-' },
    },
  ]),

  genre('pop', 'ポップス', [
    {
      id: 'pop-standard',
      name: 'ポップス',
      bpm: 112,
      description: '付点リズムのベース、クリーンなギターのストローク、ピアノの和音。',
      drums: {
        grid: 'sixteenth',
        fill: 'toms',
        rows: {
          hat: 'x.o.x.o.x.o.x.o.',
          kick: 'X.....x...x.x...',
          snare: '....X.......X...',
        },
      },
      bass: { kind: 'pattern', grid: 'sixteenth', steps: 'X--x--x-X--x--x-' },
      guitar: { kind: 'strum', timbre: 'clean', grid: 'sixteenth', steps: 'D---.udu D---.udu' },
      keys: { kind: 'comp', timbre: 'piano', grid: 'sixteenth', steps: 'x-----x-x-----x-' },
    },
  ]),

  genre('funk', 'ファンク', [
    {
      id: 'funk-16',
      name: 'ファンク16',
      bpm: 100,
      description: '16分のハット、ゴーストノート、スラップ風ベース、ミュートのカッティング。',
      drums: {
        grid: 'sixteenth',
        fill: 'snare',
        rows: {
          hat: 'xoxoxoxoxoxoxoxo',
          openHat: '..............x.',
          kick: 'X.....x..x.x....',
          snare: 'g...X..g.g..X..g',
        },
      },
      bass: { kind: 'pattern', grid: 'sixteenth', steps: 'X--x.xu.x.xx.mu.' },
      guitar: { kind: 'strum', timbre: 'clean', grid: 'sixteenth', steps: 'x.xxD.xuxuxxD.xu' },
      keys: { kind: 'comp', timbre: 'clav', grid: 'sixteenth', steps: '..x...x...x..x..' },
    },
  ]),

  genre('blues', 'ブルース', [
    {
      id: 'blues-shuffle',
      name: 'ブルース・シャッフル',
      bpm: 88,
      description: '3連のスローシャッフル。ライドで跳ね、ベースは 1-5-6-5。',
      drums: {
        grid: 'triplet',
        fill: 'snare',
        rows: {
          ride: 'x.x x.x x.x x.x',
          hat: '... x.. ... x..',
          kick: 'X.. ... x.. ...',
          snare: '... X.. ... X..',
        },
      },
      bass: { kind: 'pattern', grid: 'triplet', steps: 'x-x f-f s-s f-f' },
      guitar: { kind: 'strum', timbre: 'crunch', grid: 'triplet', steps: 'D-d D-- D-d D--' },
      keys: { kind: 'comp', timbre: 'piano', grid: 'triplet', steps: 'x-x x-x x-x x-x' },
    },
  ]),

  genre('jazz', 'ジャズ', [
    {
      id: 'jazz-swing',
      name: '4ビート・スウィング',
      bpm: 132,
      description: 'ウォーキングベース、ライドのスウィング、ギターは4拍刻み（フレディ・グリーン風）。',
      drums: {
        grid: 'triplet',
        fill: 'snare',
        rows: {
          ride: 'x.. x.x x.. x.x',
          hat: '... o.. ... o..',
          kick: 'g.. g.. g.. g..',
          snare: '... ... g.. ..g',
        },
      },
      bass: { kind: 'walking' },
      guitar: { kind: 'strum', timbre: 'clean', grid: 'triplet', steps: 'd-. d-. d-. d-.' },
      keys: { kind: 'comp', timbre: 'piano', grid: 'triplet', steps: '... ..x ..x ...' },
    },
  ]),

  genre('bossa', 'ボサノバ', [
    {
      id: 'bossa-nova',
      name: 'ボサノバ',
      bpm: 128,
      description: 'クロススティックのクラーベ、根音と5度のベース、ナイロンギター風のコンピング。',
      drums: {
        grid: 'sixteenth',
        fill: 'simple',
        rows: {
          rim: 'x..x..x...x..x..',
          hat: 'x.x.x.x.x.x.x.x.',
          kick: 'X.....x.X.....x.',
        },
      },
      bass: { kind: 'pattern', grid: 'sixteenth', steps: 'X-----f-X-----f-' },
      guitar: { kind: 'strum', timbre: 'clean', grid: 'sixteenth', steps: 'D..d..d...d..d..' },
      keys: { kind: 'comp', timbre: 'piano', grid: 'sixteenth', steps: '..x...x...x...x.' },
    },
  ]),

  genre('reggae', 'レゲエ', [
    {
      id: 'reggae-onedrop',
      name: 'ワンドロップ',
      bpm: 76,
      description: '3拍目だけにキックとスネア。ギターとオルガンは裏打ち（スカンク）。',
      drums: {
        grid: 'sixteenth',
        fill: 'snare',
        rows: {
          hat: 'x.x.x.x.x.x.x.x.',
          kick: '........X.......',
          rim: '........X.......',
        },
      },
      bass: { kind: 'pattern', grid: 'sixteenth', steps: 'X---..x-X-..x...' },
      guitar: { kind: 'strum', timbre: 'clean', grid: 'sixteenth', steps: '..D...D...D...D.' },
      keys: { kind: 'comp', timbre: 'organ', grid: 'sixteenth', steps: '..x...x...x...x.' },
    },
  ]),

  genre('metal', 'メタル', [
    {
      id: 'metal-doublebass',
      name: '2バス',
      bpm: 168,
      description: 'ツーバスの16分連打、16分のパームミュート、ベースはルートの16分。',
      drums: {
        grid: 'sixteenth',
        fill: 'toms',
        rows: {
          ride: 'x.x.x.x.x.x.x.x.',
          crash: 'X...............',
          kick: 'XxXxXxXxXxXxXxXx',
          snare: '....X.......X...',
        },
      },
      bass: { kind: 'pattern', grid: 'sixteenth', steps: 'XxxxXxxxXxxxXxxx' },
      guitar: { kind: 'power', timbre: 'dist', grid: 'sixteenth', steps: 'XpppXpppXpXpXppp' },
    },
  ]),
]

export const ALL_VARIANTS: StyleVariant[] = GENRES.flatMap((g) => g.variants)

export function getVariant(id: string): StyleVariant {
  return ALL_VARIANTS.find((v) => v.id === id) ?? ALL_VARIANTS[0]
}

export function getGenre(id: string): Genre {
  return GENRES.find((g) => g.id === id) ?? GENRES[0]
}
