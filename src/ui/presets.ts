export interface Preset {
  name: string
  text: string
  /** 選ぶと切り替えるバリエーション（ジャンルも決まる） */
  variantId?: string
  /** 選ぶと切り替えるテンポ */
  bpm?: number
  /** 選ぶと設定する移調（半音） */
  transpose?: number
}

export const PRESETS: Preset[] = [
  { name: '王道進行', text: '| F | G | Em | Am |' },
  { name: 'カノン進行', text: '| C | G | Am | Em | F | C | F | G |' },
  { name: '小室進行', text: '| Am | F | G | C |' },
  { name: 'ジャズポップ進行', text: '| Fmaj7 | E7 | Am7 | Gm7 C7 |' },
  { name: 'ブルース12小節', text: '| C7 | C7 | C7 | C7 | F7 | F7 | C7 | C7 | G7 | F7 | C7 | G7 |' },
  { name: 'ジャズ II-V-I', text: '| Dm7 | G7 | Cmaj7 | Cmaj7 |' },
  { name: 'ロック（I-IV-V）', text: '| A | D | E | A |' },
  // 公開されている解説記事のコード分析をもとにした概略（原曲キー Cm）。細部は原曲と異なる場合があります
  {
    name: '残酷な天使のテーゼ（サビ）',
    text: ['| Cm Fm | Bb Eb | Cm Fm | Bb Eb |', '| Cm Fm | Bb Fm | Cm Fm | Bb Eb |', '| Cm Fm | Bb Gm Bb Cm |'].join('\n'),
    variantId: 'anime-fast',
    bpm: 128,
    transpose: 0,
  },
  {
    name: '残酷な天使のテーゼ（Aメロ〜Bメロ）',
    text: [
      '| Eb | Bb | Cm Bb | Abmaj7 |',
      '| Bbsus4 Bb | Ebsus4 Cm7 | Abmaj7 | Gm Cm |',
      '| Fm7 Bb7 | Bbm7 Eb7 | Abmaj7 | Gm Cm |',
      '| Dm7b5 G |',
    ].join('\n'),
    variantId: 'anime-fast',
    bpm: 128,
    transpose: 0,
  },
]
