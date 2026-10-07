// Tone.js による合成音の楽器。Instrument インターフェイスの裏に隠し、将来サンプル音源へ差し替え可能にする。
import * as Tone from 'tone'
import type { DrumEvent, NoteEvent, PitchedEvent, Timbre } from '../music/types'

export interface Instrument {
  /** 出力ノード。チャンネルにつなぐ */
  readonly output: Tone.ToneAudioNode
  /** time は AudioContext 時刻（秒）。sixteenth は現在のテンポでの16分音符の秒数 */
  trigger(event: NoteEvent, time: number, sixteenth: number): void
  /** 鳴っている音をすべて止める */
  silence(): void
  dispose(): void
}

const midiToFreq = (m: number) => Tone.Frequency(m, 'midi').toFrequency()

/** 同時刻の再トリガーなどで Tone が投げる例外で、再生全体が止まらないようにする */
function safely(fn: () => void) {
  try {
    fn()
  } catch {
    // 無視（同時刻の二重発音など）
  }
}

// ------------------------------------------------------------------ ドラム

export class DrumKit implements Instrument {
  readonly output = new Tone.Gain(1)
  private kick = new Tone.MembraneSynth({
    pitchDecay: 0.04,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.05 },
  })
  private snareNoise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.02 },
  })
  private snareBody = new Tone.MembraneSynth({
    pitchDecay: 0.02,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.02 },
  })
  private rim = new Tone.MembraneSynth({
    pitchDecay: 0.005,
    octaves: 1.5,
    envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
  })
  private hat = this.metal(0.05, 5.1, 7000)
  private openHat = this.metal(0.28, 5.1, 7000)
  private ride = this.metal(0.9, 3.1, 5500)
  private crash = this.metal(1.6, 5.1, 3500)
  private toms = {
    tom1: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 2, envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.05 } }),
    tom2: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 2, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.05 } }),
    tom3: new Tone.MembraneSynth({ pitchDecay: 0.06, octaves: 2, envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.05 } }),
  }
  private snareFilter = new Tone.Filter(1800, 'highpass')

  constructor() {
    this.kick.volume.value = -2
    this.snareNoise.volume.value = -8
    this.snareBody.volume.value = -10
    this.rim.volume.value = -12
    this.hat.volume.value = -26
    this.openHat.volume.value = -26
    this.ride.volume.value = -27
    this.crash.volume.value = -22
    for (const t of Object.values(this.toms)) t.volume.value = -4

    this.snareNoise.chain(this.snareFilter, this.output)
    for (const n of [this.kick, this.snareBody, this.rim, this.hat, this.openHat, this.ride, this.crash, ...Object.values(this.toms)]) {
      n.connect(this.output)
    }
  }

  private metal(decay: number, harmonicity: number, resonance: number) {
    return new Tone.MetalSynth({
      envelope: { attack: 0.001, decay, release: Math.min(decay, 0.3) },
      harmonicity,
      modulationIndex: 32,
      resonance,
      octaves: 1.5,
    })
  }

  trigger(event: NoteEvent, time: number): void {
    if (event.part !== 'drums') return
    const e: DrumEvent = event
    const v = e.velocity
    safely(() => {
      switch (e.drum) {
        case 'kick':
          this.kick.triggerAttackRelease('C1', 0.2, time, v)
          break
        case 'snare':
          this.snareNoise.triggerAttackRelease(0.15, time, v)
          this.snareBody.triggerAttackRelease('E3', 0.1, time, v * 0.8)
          break
        case 'rim':
          this.rim.triggerAttackRelease('A4', 0.03, time, v)
          break
        case 'hat':
          this.hat.triggerAttackRelease(250, 0.04, time, v)
          break
        case 'openHat':
          this.hat.triggerRelease(time)
          this.openHat.triggerAttackRelease(250, 0.25, time, v)
          break
        case 'ride':
          this.ride.triggerAttackRelease(340, 0.5, time, v)
          break
        case 'crash':
          this.crash.triggerAttackRelease(300, 1.2, time, v)
          break
        case 'tom1':
          this.toms.tom1.triggerAttackRelease('C3', 0.2, time, v)
          break
        case 'tom2':
          this.toms.tom2.triggerAttackRelease('G2', 0.25, time, v)
          break
        case 'tom3':
          this.toms.tom3.triggerAttackRelease('D2', 0.3, time, v)
          break
      }
    })
  }

  silence(): void {
    safely(() => {
      this.crash.triggerRelease()
      this.ride.triggerRelease()
      this.openHat.triggerRelease()
    })
  }

  dispose(): void {
    for (const n of [
      this.output,
      this.kick,
      this.snareNoise,
      this.snareBody,
      this.rim,
      this.hat,
      this.openHat,
      this.ride,
      this.crash,
      this.snareFilter,
      ...Object.values(this.toms),
    ]) {
      n.dispose()
    }
  }
}

// ------------------------------------------------------------------ ベース

export class BassSynth implements Instrument {
  readonly output = new Tone.Gain(1)
  private synth = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    filter: { Q: 2, type: 'lowpass', rolloff: -24 },
    envelope: { attack: 0.005, decay: 0.2, sustain: 0.6, release: 0.08 },
    filterEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.25, release: 0.2, baseFrequency: 110, octaves: 3 },
  })

  constructor() {
    this.synth.volume.value = -4
    this.synth.connect(this.output)
  }

  trigger(event: NoteEvent, time: number, sixteenth: number): void {
    if (event.part !== 'bass') return
    const dur = Math.max(0.05, event.duration * sixteenth * 0.92)
    safely(() => this.synth.triggerAttackRelease(midiToFreq(event.pitches[0]), dur, time, event.velocity))
  }

  silence(): void {
    safely(() => this.synth.triggerRelease())
  }

  dispose(): void {
    this.synth.dispose()
    this.output.dispose()
  }
}

// ------------------------------------------------------------------ ギター

export class GuitarSynth implements Instrument {
  readonly output = new Tone.Gain(1)
  private lowpass = new Tone.Filter(4000, 'lowpass')
  private dist = new Tone.Distortion(0.35)
  private heavy = new Tone.Distortion(0.8)
  private chordPoly: Record<'clean' | 'crunch' | 'dist', Tone.PolySynth> = {
    clean: this.poly('triangle', 0.5, 0.2),
    crunch: this.poly('sawtooth', 0.35, 0.35),
    dist: this.poly('sawtooth', 0.3, 0.5),
  }
  private plucks = Array.from({ length: 6 }, () => new Tone.PluckSynth({ attackNoise: 1.2, dampening: 3500, resonance: 0.97 }))
  private next = 0

  constructor() {
    this.lowpass.connect(this.output)
    this.chordPoly.clean.connect(this.lowpass)
    this.chordPoly.crunch.chain(this.dist, this.lowpass)
    this.chordPoly.dist.chain(this.heavy, this.lowpass)
    this.chordPoly.clean.volume.value = -8
    this.chordPoly.crunch.volume.value = -14
    this.chordPoly.dist.volume.value = -16
    for (const p of this.plucks) {
      p.volume.value = -2
      p.connect(this.lowpass)
    }
  }

  private poly(type: 'triangle' | 'sawtooth', decay: number, sustain: number) {
    return new Tone.PolySynth(Tone.Synth, {
      oscillator: { type },
      envelope: { attack: 0.004, decay, sustain, release: 0.12 },
    })
  }

  trigger(event: NoteEvent, time: number, sixteenth: number): void {
    if (event.part !== 'guitar') return
    const e: PitchedEvent = event
    const timbre = (e.timbre === 'dist' || e.timbre === 'crunch' ? e.timbre : 'clean') as 'clean' | 'crunch' | 'dist'
    const dur = Math.max(0.04, e.duration * sixteenth * 0.95)

    // クリーンの単音（アルペジオ）は PluckSynth の持ち回り
    if (timbre === 'clean' && e.pitches.length === 1) {
      const p = this.plucks[this.next++ % this.plucks.length]
      safely(() => p.triggerAttack(midiToFreq(e.pitches[0]), time))
      return
    }

    // ストローク: 音ごとに少しずつずらす（ダウンは低音から、アップは高音から）
    const pitches = e.strum === 'up' ? [...e.pitches].reverse() : e.pitches
    const spread = Math.min(0.012, sixteenth * 0.12)
    safely(() => {
      pitches.forEach((m, i) => {
        this.chordPoly[timbre].triggerAttackRelease(midiToFreq(m), dur, time + i * spread, e.velocity)
      })
    })
  }

  silence(): void {
    safely(() => {
      for (const p of Object.values(this.chordPoly)) p.releaseAll()
    })
  }

  dispose(): void {
    for (const n of [this.output, this.lowpass, this.dist, this.heavy, ...Object.values(this.chordPoly), ...this.plucks]) n.dispose()
  }
}

// ------------------------------------------------------------------ キーボード

export class KeysSynth implements Instrument {
  readonly output = new Tone.Gain(1)
  private padFilter = new Tone.Filter(1800, 'lowpass')
  private voices: Record<'piano' | 'organ' | 'pad' | 'clav', Tone.PolySynth> = {
    piano: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.9, sustain: 0.15, release: 0.6 },
    }),
    organ: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'custom', partials: [1, 0.7, 0.5, 0.3] },
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.9, release: 0.08 },
    }),
    pad: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.25, decay: 0.3, sustain: 0.7, release: 0.8 },
    }),
    clav: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.002, decay: 0.12, sustain: 0.02, release: 0.05 },
    }),
  }

  constructor() {
    this.padFilter.connect(this.output)
    this.voices.pad.connect(this.padFilter)
    this.voices.piano.connect(this.output)
    this.voices.organ.connect(this.output)
    this.voices.clav.connect(this.output)
    this.voices.piano.volume.value = -8
    this.voices.organ.volume.value = -14
    this.voices.pad.volume.value = -18
    this.voices.clav.volume.value = -18
  }

  trigger(event: NoteEvent, time: number, sixteenth: number): void {
    if (event.part !== 'keys') return
    const timbre = this.voiceFor(event.timbre)
    const dur = Math.max(0.05, event.duration * sixteenth * 0.95)
    safely(() => {
      this.voices[timbre].triggerAttackRelease(
        event.pitches.map(midiToFreq),
        dur,
        time,
        event.velocity,
      )
    })
  }

  private voiceFor(t: Timbre | undefined): 'piano' | 'organ' | 'pad' | 'clav' {
    return t === 'organ' || t === 'pad' || t === 'clav' ? t : 'piano'
  }

  silence(): void {
    safely(() => {
      for (const v of Object.values(this.voices)) v.releaseAll()
    })
  }

  dispose(): void {
    for (const n of [this.output, this.padFilter, ...Object.values(this.voices)]) n.dispose()
  }
}

// ------------------------------------------------------------------ クリック

export class Clicker {
  readonly output = new Tone.Gain(1)
  private synth = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
  })

  constructor() {
    this.synth.volume.value = -14
    this.synth.connect(this.output)
  }

  click(accent: boolean, time: number): void {
    safely(() => this.synth.triggerAttackRelease(accent ? 1800 : 1200, 0.025, time, accent ? 1 : 0.7))
  }

  dispose(): void {
    this.synth.dispose()
    this.output.dispose()
  }
}
