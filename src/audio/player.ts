// スケジューラ: Tone.Transport にイベントを載せて再生する。
// 発音はすべて Transport.schedule 経由（setTimeout では鳴らさない）。
import * as Tone from 'tone'
import type { BarRange } from '../music/arrange'
import { type NoteEvent, toToneTime } from '../music/types'
import { BassSynth, Clicker, DrumKit, GuitarSynth, type Instrument, KeysSynth } from './instruments'
import { type MixerKey, type MixerState, MIXER_KEYS, channelDb, volumeToDb } from './mixer'

export interface PlaybackSpec {
  events: NoteEvent[]
  beatsPerBar: number
  /** 再生する小節範囲（end は含まない） */
  range: BarRange
  loop: boolean
}

export interface PlayerCallbacks {
  /** 再生中の小節（0 始まり）。カウントイン中は -1、停止で null */
  onBar(bar: number | null): void
  /** 再生が止まった（自動停止も含む） */
  onStop(): void
}

/** カウントイン用に、チャートの前に1小節ぶんのオフセットを置く */
const BAR_OFFSET = 1

interface Graph {
  instruments: Record<'drums' | 'bass' | 'guitar' | 'keys', Instrument>
  channels: Record<MixerKey, Tone.Channel>
  clicker: Clicker
  countClicker: Clicker
  countChannel: Tone.Channel
  limiter: Tone.Limiter
}

export class Player {
  private graph: Graph | null = null
  private ids: number[] = []
  private mixer: MixerState | null = null
  private playing = false
  private starting = false

  constructor(private callbacks: PlayerCallbacks) {}

  get isPlaying() {
    return this.playing
  }

  /** ユーザー操作の中で呼ぶ（iOS の音声アンロック）。最初の await Tone.start() を含む */
  async start(spec: PlaybackSpec, bpm: number, mixer: MixerState, countIn: boolean): Promise<void> {
    if (this.playing || this.starting) return
    this.starting = true
    try {
      await Tone.start()
    } finally {
      this.starting = false
    }
    if (this.playing) return
    this.ensureGraph()
    const transport = Tone.getTransport()
    transport.bpm.value = bpm
    this.setMixer(mixer)
    this.schedule(spec)

    const startBar = countIn ? spec.range.start : spec.range.start + BAR_OFFSET
    transport.position = `${startBar}:0:0`
    this.playing = true
    transport.start('+0.08')
  }

  stop(): void {
    if (!this.playing) return
    this.playing = false
    const transport = Tone.getTransport()
    transport.stop()
    this.clearSchedule()
    Tone.getDraw().cancel(0)
    if (this.graph) {
      for (const inst of Object.values(this.graph.instruments)) inst.silence()
    }
    this.callbacks.onBar(null)
    this.callbacks.onStop()
  }

  /** 再生中でもテンポを変えられる（Transport.bpm） */
  setBpm(bpm: number): void {
    if (!this.playing) return // 停止中は start() で設定する
    Tone.getTransport().bpm.rampTo(bpm, 0.05)
  }

  setMixer(mixer: MixerState): void {
    this.mixer = mixer
    if (!this.graph) return
    for (const key of MIXER_KEYS) {
      // Channel.mute は volume.value = -Infinity で実装されており、後続の volume 代入で解除されてしまう。
      // ミュート/ソロも含めた最終値を volume に一本化して設定する
      this.graph.channels[key].volume.value = channelDb(mixer, key)
    }
    // カウントインはクリックのミュート設定に関係なく鳴らし、音量だけ合わせる
    this.graph.countChannel.volume.value = volumeToDb(mixer.click.volume)
  }

  /** 内容が変わったら（進行・スタイル・フィル・ループ範囲）再スケジュール。再生位置は保つ */
  update(spec: PlaybackSpec): void {
    if (this.graph) this.schedule(spec)
  }

  dispose(): void {
    this.stop()
    this.clearSchedule()
    if (!this.graph) return
    for (const i of Object.values(this.graph.instruments)) i.dispose()
    for (const c of Object.values(this.graph.channels)) c.dispose()
    this.graph.clicker.dispose()
    this.graph.countClicker.dispose()
    this.graph.countChannel.dispose()
    this.graph.limiter.dispose()
    this.graph = null
  }

  // ------------------------------------------------------------ 内部

  private ensureGraph(): Graph {
    if (this.graph) return this.graph
    const limiter = new Tone.Limiter(-1).toDestination()
    const channels = {} as Record<MixerKey, Tone.Channel>
    for (const key of MIXER_KEYS) channels[key] = new Tone.Channel().connect(limiter)

    const instruments = {
      drums: new DrumKit(),
      bass: new BassSynth(),
      guitar: new GuitarSynth(),
      keys: new KeysSynth(),
    }
    for (const k of ['drums', 'bass', 'guitar', 'keys'] as const) instruments[k].output.connect(channels[k])

    const clicker = new Clicker()
    clicker.output.connect(channels.click)
    const countChannel = new Tone.Channel().connect(limiter)
    const countClicker = new Clicker()
    countClicker.output.connect(countChannel)

    this.graph = { instruments, channels, clicker, countClicker, countChannel, limiter }
    if (this.mixer) this.setMixer(this.mixer)
    return this.graph
  }

  private clearSchedule(): void {
    const transport = Tone.getTransport()
    for (const id of this.ids) transport.clear(id)
    this.ids = []
  }

  private schedule(spec: PlaybackSpec): void {
    const graph = this.ensureGraph()
    const transport = Tone.getTransport()
    this.clearSchedule()

    transport.timeSignature = spec.beatsPerBar
    const { range, beatsPerBar } = spec
    const at = (bar: number, beat = 0) => `${bar + BAR_OFFSET}:${beat}:0`
    const add = (id: number) => this.ids.push(id)

    // 楽器イベント
    for (const ev of spec.events) {
      const inst = graph.instruments[ev.part]
      add(
        transport.schedule((time) => {
          const sixteenth = 60 / transport.bpm.value / 4
          inst.trigger(ev, time, sixteenth)
        }, toToneTime(ev.time, BAR_OFFSET)),
      )
    }

    // クリック（ミュートはチャンネル側）と小節ハイライト
    for (let bar = range.start; bar < range.end; bar++) {
      for (let beat = 0; beat < beatsPerBar; beat++) {
        add(
          transport.schedule((time) => graph.clicker.click(beat === 0, time), at(bar, beat)),
        )
      }
      add(
        transport.schedule((time) => {
          Tone.getDraw().schedule(() => this.callbacks.onBar(bar), time)
        }, at(bar)),
      )
    }

    // カウントイン: 範囲の1小節前（チャートの小節 start-1 と同じ位置）
    for (let beat = 0; beat < beatsPerBar; beat++) {
      add(
        transport.schedule(
          (time) => graph.countClicker.click(beat === 0, time),
          `${range.start}:${beat}:0`,
        ),
      )
    }
    add(
      transport.schedule((time) => {
        Tone.getDraw().schedule(() => this.callbacks.onBar(-1), time)
      }, `${range.start}:0:0`),
    )

    // ループ
    transport.loopStart = at(range.start)
    transport.loopEnd = at(range.end)
    transport.loop = spec.loop

    // ループしないときは範囲の終わりで停止
    if (!spec.loop) {
      add(
        transport.schedule((time) => {
          Tone.getDraw().schedule(() => this.stop(), time)
        }, at(range.end)),
      )
    }
  }
}
