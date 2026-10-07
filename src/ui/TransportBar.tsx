interface Props {
  playing: boolean
  canPlay: boolean
  bpm: number
  loop: boolean
  countIn: boolean
  click: boolean
  onToggle: () => void
  onBpm: (bpm: number) => void
  onLoop: (v: boolean) => void
  onCountIn: (v: boolean) => void
  onClick: (v: boolean) => void
}

const clampBpm = (n: number) => Math.min(240, Math.max(40, Math.round(n)))

export function TransportBar(p: Props) {
  return (
    <header className="transport">
      <button
        className={`play ${p.playing ? 'is-playing' : ''}`}
        onClick={p.onToggle}
        disabled={!p.playing && !p.canPlay}
        aria-label={p.playing ? '停止' : '再生'}
      >
        {p.playing ? '■ 停止' : '▶ 再生'}
      </button>

      <div className="tempo">
        <label htmlFor="bpm-num">テンポ</label>
        <input
          id="bpm-num"
          type="number"
          inputMode="numeric"
          min={40}
          max={240}
          value={p.bpm}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n) && e.target.value !== '') p.onBpm(clampBpm(n))
          }}
        />
        <input
          type="range"
          min={40}
          max={240}
          value={p.bpm}
          onChange={(e) => p.onBpm(clampBpm(Number(e.target.value)))}
          aria-label="テンポ"
        />
      </div>

      <div className="toggles">
        <Toggle label="ループ" on={p.loop} onChange={p.onLoop} />
        <Toggle label="カウントイン" on={p.countIn} onChange={p.onCountIn} />
        <Toggle label="クリック" on={p.click} onChange={p.onClick} />
      </div>
    </header>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => onChange(!on)}>
      {label}
    </button>
  )
}
