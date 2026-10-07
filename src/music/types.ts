// 生成ロジックと再生層の間で受け渡すイベント型

export type PartId = 'drums' | 'bass' | 'guitar' | 'keys'

export type DrumPiece =
  | 'kick'
  | 'snare'
  | 'rim'
  | 'hat'
  | 'openHat'
  | 'ride'
  | 'crash'
  | 'tom1'
  | 'tom2'
  | 'tom3'

/** 音楽時間。bar は 0 始まりの小節、beat は 0 始まりの拍、sixteenth は拍内の16分位置（3連は小数） */
export interface MusicTime {
  bar: number
  beat: number
  sixteenth: number
}

export type Timbre = 'clean' | 'crunch' | 'dist' | 'piano' | 'organ' | 'pad' | 'clav'

interface BaseEvent {
  time: MusicTime
  /** 16分音符単位 */
  duration: number
  /** 0〜1 */
  velocity: number
}

export interface DrumEvent extends BaseEvent {
  part: 'drums'
  drum: DrumPiece
}

export interface PitchedEvent extends BaseEvent {
  part: 'bass' | 'guitar' | 'keys'
  /** MIDI ノート番号（和音は複数） */
  pitches: number[]
  timbre?: Timbre
  /** ギターのストロークの向き */
  strum?: 'down' | 'up'
}

export type NoteEvent = DrumEvent | PitchedEvent

/** 小節内の位置（16分単位、小数可）→ MusicTime */
export function timeAt(bar: number, sixteenths: number): MusicTime {
  const beat = Math.floor(sixteenths / 4 + 1e-9)
  return { bar, beat, sixteenth: round(sixteenths - beat * 4) }
}

export function toSixteenths(t: MusicTime, beatsPerBar: number): number {
  return (t.bar * beatsPerBar + t.beat) * 4 + t.sixteenth
}

/** Tone.js の "bars:quarters:sixteenths" 表記 */
export function toToneTime(t: MusicTime, barOffset = 0): string {
  return `${t.bar + barOffset}:${t.beat}:${t.sixteenth}`
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000
}
