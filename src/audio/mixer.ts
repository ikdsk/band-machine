// ミキサー状態と、ミュート/ソロ/音量の解決（純粋関数。Tone には依存しない）

export type MixerKey = 'drums' | 'bass' | 'guitar' | 'keys' | 'click'

export const MIXER_KEYS: MixerKey[] = ['drums', 'bass', 'guitar', 'keys', 'click']

export const MIXER_LABELS: Record<MixerKey, string> = {
  drums: 'ドラム',
  bass: 'ベース',
  guitar: 'ギター',
  keys: 'キーボード',
  click: 'クリック',
}

export interface ChannelState {
  mute: boolean
  solo: boolean
  /** 0〜1 */
  volume: number
}

export type MixerState = Record<MixerKey, ChannelState>

export const DEFAULT_MIXER: MixerState = {
  drums: { mute: false, solo: false, volume: 0.8 },
  bass: { mute: false, solo: false, volume: 0.8 },
  guitar: { mute: false, solo: false, volume: 0.7 },
  keys: { mute: false, solo: false, volume: 0.6 },
  click: { mute: true, solo: false, volume: 0.5 },
}

/** 誰かがソロならソロのチャンネルだけ、そうでなければミュートされていないチャンネルが鳴る */
export function isAudible(mixer: MixerState, key: MixerKey): boolean {
  const ch = mixer[key]
  if (ch.mute) return false
  const anySolo = MIXER_KEYS.some((k) => mixer[k].solo)
  return anySolo ? ch.solo : true
}

/** スライダー値(0〜1) → dB。0 は無音扱い */
export function volumeToDb(volume: number): number {
  if (volume <= 0) return -Infinity
  return Math.max(-60, 20 * Math.log10(volume))
}

/** チャンネルの Volume に設定する dB。ミュート/ソロで消える場合は -Infinity */
export function channelDb(mixer: MixerState, key: MixerKey): number {
  return isAudible(mixer, key) ? volumeToDb(mixer[key].volume) : -Infinity
}
