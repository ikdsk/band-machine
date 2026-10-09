import { describe, expect, it } from 'vitest'
import { DEFAULT_MIXER, type MixerState, channelDb, isAudible, volumeToDb } from './mixer'

const mixer = (patch: Partial<Record<keyof MixerState, Partial<MixerState['drums']>>>): MixerState => {
  const m = structuredClone(DEFAULT_MIXER)
  m.click.mute = false
  for (const [k, v] of Object.entries(patch)) Object.assign(m[k as keyof MixerState], v)
  return m
}

describe('isAudible', () => {
  it('何も指定しなければすべて鳴る', () => {
    const m = mixer({})
    for (const k of ['drums', 'bass', 'guitar', 'keys', 'click'] as const) expect(isAudible(m, k)).toBe(true)
  })
  it('ミュートしたパートだけが消える', () => {
    const m = mixer({ guitar: { mute: true } })
    expect(isAudible(m, 'guitar')).toBe(false)
    expect(isAudible(m, 'bass')).toBe(true)
  })
  it('ソロがあれば、ソロ以外は消える', () => {
    const m = mixer({ bass: { solo: true } })
    expect(isAudible(m, 'bass')).toBe(true)
    expect(isAudible(m, 'drums')).toBe(false)
    expect(isAudible(m, 'click')).toBe(false)
  })
  it('複数ソロ可。ミュートはソロより優先', () => {
    const m = mixer({ bass: { solo: true }, drums: { solo: true }, guitar: { solo: true, mute: true } })
    expect(isAudible(m, 'bass')).toBe(true)
    expect(isAudible(m, 'drums')).toBe(true)
    expect(isAudible(m, 'guitar')).toBe(false)
  })
})

describe('volumeToDb', () => {
  it('1 → 0dB、0 → 無音、下限 -60dB', () => {
    expect(volumeToDb(1)).toBeCloseTo(0)
    expect(volumeToDb(0)).toBe(-Infinity)
    expect(volumeToDb(0.5)).toBeCloseTo(-6.02, 1)
    expect(volumeToDb(0.0001)).toBe(-60)
  })
})

describe('channelDb（実際に Volume へ設定する値）', () => {
  it('ミュート時は -Infinity', () => {
    expect(channelDb(mixer({ guitar: { mute: true } }), 'guitar')).toBe(-Infinity)
  })
  it('ソロがあると非ソロは -Infinity、ソロ自身は音量どおり', () => {
    const m = mixer({ bass: { solo: true, volume: 0.5 } })
    expect(channelDb(m, 'drums')).toBe(-Infinity)
    expect(channelDb(m, 'bass')).toBeCloseTo(-6.02, 1)
  })
  it('ミュート解除で音量に戻る', () => {
    expect(channelDb(mixer({ drums: { mute: true } }), 'drums')).toBe(-Infinity)
    expect(channelDb(mixer({ drums: { mute: false, volume: 1 } }), 'drums')).toBeCloseTo(0)
  })
  it('音量 0 は -Infinity', () => {
    expect(channelDb(mixer({ keys: { volume: 0 } }), 'keys')).toBe(-Infinity)
  })
})
