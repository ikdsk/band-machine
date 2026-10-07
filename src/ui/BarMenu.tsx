import { type FillKind, FILL_KINDS } from '../music/fills'

interface Props {
  bar: number
  total: number
  fill: FillKind | undefined
  range: { start: number; end: number } | null
  onFill: (kind: FillKind | undefined) => void
  onLoopStart: () => void
  onLoopEnd: () => void
  onClearRange: () => void
  onClose: () => void
}

export function BarMenu(p: Props) {
  return (
    <section className="card bar-menu" aria-label={`${p.bar + 1}小節目のメニュー`}>
      <div className="bar-menu-head">
        <h2>{p.bar + 1}小節目</h2>
        <button className="chip" onClick={p.onClose}>
          閉じる
        </button>
      </div>

      <h3>フィル</h3>
      <div className="chips">
        <button className={`chip ${p.fill === undefined ? 'on' : ''}`} onClick={() => p.onFill(undefined)}>
          なし
        </button>
        {FILL_KINDS.map((f) => (
          <button key={f.kind} className={`chip ${p.fill === f.kind ? 'on' : ''}`} onClick={() => p.onFill(f.kind)}>
            {f.label}
          </button>
        ))}
      </div>
      <p className="hint">フィルの次の小節の頭にはクラッシュシンバルが入ります。</p>

      <h3>ループ範囲（A-B）</h3>
      <div className="chips">
        <button className="chip" onClick={p.onLoopStart}>
          ここからループ開始 (A)
        </button>
        <button className="chip" onClick={p.onLoopEnd}>
          ここでループ終了 (B)
        </button>
        <button className="chip" onClick={p.onClearRange} disabled={!p.range}>
          範囲を解除
        </button>
      </div>
      {p.range && (
        <p className="hint">
          現在の範囲: {p.range.start + 1}〜{p.range.end}小節目
        </p>
      )}
    </section>
  )
}
