// スタイル（ジャンル×バリエーション）のパターン定義の型。
//
// パターンはステップ列の文字列で書く（空白は無視、読みやすさのために自由に入れてよい）。
// grid: 'sixteenth' は1拍=4ステップ、'triplet' は1拍=3ステップ（3連・スウィング用）。
//
// ドラム行の文字: X=強 x=中 o=弱 g=ゴースト .=休み
// ピッチ系の共通: '-' は直前の音を伸ばす（音価 = 1 + 続く '-' の数）、'.' は休み
//   ベース : x/X ルート  u オクターブ上  f 5度  t 3度  s 6度  m ミュート気味のルート
//   ギター strum : D/d ダウン(強/弱)  U/u アップ(強/弱)  x ミュートしたカッティング
//   ギター power : X 開放(強)  x 開放  p パームミュート
//   arpeggio : 数字 = ボイシングの下から n 番目の音（音数を超えたら折り返し）
//   キーボード comp : X 和音＋左手ルート  x 和音  o 弱い和音

import type { DrumPiece, Timbre } from '../music/types'

export type Grid = 'sixteenth' | 'triplet'

export const stepsPerBeat = (g: Grid) => (g === 'triplet' ? 3 : 4)

export type FillStyle = 'toms' | 'snare' | 'simple'

export type DrumRows = Partial<Record<DrumPiece, string>>

export interface DrumStyle {
  grid: Grid
  /** 4/4 の1小節ぶん */
  rows: DrumRows
  /** 3/4 用（なければ 4/4 を3拍に切り詰める） */
  rows3?: DrumRows
  /** 「自動」フィルで使う種類 */
  fill: FillStyle
}

interface Pattern {
  grid: Grid
  steps: string
  /** 3/4 用（なければ steps を3拍に切り詰める） */
  steps3?: string
}

export type BassStyle = ({ kind: 'pattern' } & Pattern) | { kind: 'walking' }

export type GuitarStyle =
  | ({ kind: 'strum'; timbre: Timbre } & Pattern)
  | ({ kind: 'power'; timbre: Timbre } & Pattern)
  | ({ kind: 'arpeggio'; timbre: Timbre } & Pattern)

export type KeysStyle =
  | ({ kind: 'comp'; timbre: Timbre } & Pattern)
  | ({ kind: 'arpeggio'; timbre: Timbre } & Pattern)

export interface StyleVariant {
  id: string
  name: string
  genreId: string
  /** 選択時の推奨テンポ */
  bpm: number
  description: string
  drums: DrumStyle
  bass: BassStyle
  guitar: GuitarStyle
  keys?: KeysStyle
}

export interface Genre {
  id: string
  name: string
  variants: StyleVariant[]
}
