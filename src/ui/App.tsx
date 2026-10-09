import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MixerKey } from '../audio/mixer'
import type { PlaybackSpec, Player } from '../audio/player'
import { arrange } from '../music/arrange'
import { type FillKind, autoFillBars } from '../music/fills'
import { parseProgression, transposeChart } from '../music/progression'
import { getVariant } from '../styles'
import { BarMenu } from './BarMenu'
import { ChordChart } from './ChordChart'
import { MixerPanel } from './MixerPanel'
import { ProgressionEditor } from './ProgressionEditor'
import type { Preset } from './presets'
import { StylePicker } from './StylePicker'
import { TransportBar } from './TransportBar'
import { type Settings, loadSettings, saveSettings } from './settings'

export function App() {
  const [s, setS] = useState<Settings>(loadSettings)
  const [playing, setPlaying] = useState(false)
  const [currentBar, setCurrentBar] = useState<number | null>(null)
  const [selectedBar, setSelectedBar] = useState<number | null>(null)
  const patch = useCallback((p: Partial<Settings>) => setS((prev) => ({ ...prev, ...p })), [])

  // ---- 進行 → チャート → イベント（純粋関数）
  const parsed = useMemo(() => parseProgression(s.text, s.beatsPerBar), [s.text, s.beatsPerBar])
  const chart = useMemo(() => transposeChart(parsed, s.transpose), [parsed, s.transpose])
  const total = chart.bars.length
  const canPlay = chart.errors.length === 0 && total > 0

  const range = useMemo(() => {
    if (!s.range || s.range.start >= total) return null
    return { start: s.range.start, end: Math.min(total, s.range.end) }
  }, [s.range, total])

  const variant = getVariant(s.variantId)
  const effectiveRange = range ?? { start: 0, end: total }

  const spec = useMemo<PlaybackSpec>(
    () => ({
      events: canPlay
        ? arrange({
            chart,
            variant,
            beatsPerBar: s.beatsPerBar,
            fills: s.fills,
            autoFill: s.autoFill,
            loop: s.loop,
            range: effectiveRange,
          })
        : [],
      beatsPerBar: s.beatsPerBar,
      range: effectiveRange,
      loop: s.loop,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canPlay, chart, variant, s.beatsPerBar, s.fills, s.autoFill, s.loop, effectiveRange.start, effectiveRange.end],
  )

  const autoBars = useMemo(
    () => autoFillBars(effectiveRange.end, s.autoFill, effectiveRange.start),
    [effectiveRange.start, effectiveRange.end, s.autoFill],
  )

  // ---- 再生層
  // Tone.js は大きいので、画面を出したあとに別チャンクとして読み込む
  const playerRef = useRef<Player | null>(null)
  const playerLoad = useRef<Promise<Player> | null>(null)
  const loadPlayer = useCallback(() => {
    playerLoad.current ??= import('../audio/player').then(({ Player }) => {
      const p = new Player({
        onBar: (bar) => setCurrentBar(bar !== null && bar >= 0 ? bar : null),
        onStop: () => setPlaying(false),
      })
      playerRef.current = p
      return p
    })
    return playerLoad.current
  }, [])
  useEffect(() => {
    void loadPlayer()
  }, [loadPlayer])

  // 不正な入力中は、直前の正しい内容で再生を続ける
  useEffect(() => {
    if (canPlay && playerRef.current?.isPlaying) playerRef.current.update(spec)
  }, [spec, canPlay])
  useEffect(() => playerRef.current?.setBpm(s.bpm), [s.bpm])
  useEffect(() => playerRef.current?.setMixer(s.mixer), [s.mixer])
  useEffect(() => saveSettings(s), [s])

  const toggle = useCallback(async () => {
    if (playerRef.current?.isPlaying) {
      playerRef.current.stop()
      return
    }
    if (!canPlay) return
    setPlaying(true)
    try {
      const player = playerRef.current ?? (await loadPlayer())
      await player.start(spec, s.bpm, s.mixer, s.countIn)
    } catch (e) {
      console.error(e)
      setPlaying(false)
    }
  }, [loadPlayer, canPlay, spec, s.bpm, s.mixer, s.countIn])

  // スペースキーで再生/停止（入力欄・ボタン以外）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.code !== 'Space' || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName)) return
      e.preventDefault()
      void toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  // ---- ハンドラ
  const setFill = (bar: number, kind: FillKind | undefined) => {
    const fills = { ...s.fills }
    if (kind === undefined) delete fills[bar]
    else fills[bar] = kind
    patch({ fills })
  }
  const applyPreset = (p: Preset) =>
    patch({
      text: p.text,
      ...(p.variantId ? { variantId: p.variantId } : {}),
      ...(p.bpm !== undefined ? { bpm: p.bpm } : {}),
      ...(p.transpose !== undefined ? { transpose: p.transpose } : {}),
    })
  const setLoopStart = (bar: number) => {
    const end = range ? range.end : total
    patch({ range: { start: bar, end: end > bar ? end : bar + 1 } })
  }
  const setLoopEnd = (bar: number) => {
    const start = range ? range.start : 0
    patch({ range: bar >= start ? { start, end: bar + 1 } : { start: bar, end: start + 1 } })
  }
  const setMixer = (key: MixerKey, p: Partial<Settings['mixer'][MixerKey]>) =>
    patch({ mixer: { ...s.mixer, [key]: { ...s.mixer[key], ...p } } })

  return (
    <div className="app">
      <TransportBar
        playing={playing}
        canPlay={canPlay}
        bpm={s.bpm}
        loop={s.loop}
        countIn={s.countIn}
        click={!s.mixer.click.mute}
        onToggle={() => void toggle()}
        onBpm={(bpm) => patch({ bpm })}
        onLoop={(loop) => patch({ loop })}
        onCountIn={(countIn) => patch({ countIn })}
        onClick={(on) => setMixer('click', { mute: !on })}
      />

      <main>
        <ProgressionEditor
          text={s.text}
          errors={chart.errors}
          beatsPerBar={s.beatsPerBar}
          transpose={s.transpose}
          onText={(text) => patch({ text })}
          onPreset={applyPreset}
          onBeats={(beatsPerBar) => patch({ beatsPerBar })}
          onTranspose={(transpose) => patch({ transpose })}
        />

        <StylePicker
          variantId={variant.id}
          onVariant={(id) => patch({ variantId: id, bpm: getVariant(id).bpm })}
        />

        <ChordChart
          chart={chart}
          currentBar={playing ? currentBar : null}
          fills={s.fills}
          autoFillBars={autoBars}
          range={range}
          selected={selectedBar}
          autoFill={s.autoFill}
          onSelect={setSelectedBar}
          onAutoFill={(autoFill) => patch({ autoFill })}
        />

        {selectedBar !== null && selectedBar < total && (
          <BarMenu
            bar={selectedBar}
            total={total}
            fill={s.fills[selectedBar]}
            range={range}
            onFill={(k) => setFill(selectedBar, k)}
            onLoopStart={() => setLoopStart(selectedBar)}
            onLoopEnd={() => setLoopEnd(selectedBar)}
            onClearRange={() => patch({ range: null })}
            onClose={() => setSelectedBar(null)}
          />
        )}

        <MixerPanel mixer={s.mixer} onChange={setMixer} />
      </main>
    </div>
  )
}
