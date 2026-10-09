import { Fragment } from 'react'
import type { FillKind } from '../music/fills'
import type { Chart } from '../music/progression'

const SHORT: Record<FillKind, string> = {
  auto: 'フィル',
  toms: 'タム',
  snare: 'スネア',
  simple: '簡易',
  break: 'ブレイク',
}

interface Props {
  chart: Chart
  currentBar: number | null
  fills: Record<number, FillKind>
  autoFillBars: number[]
  range: { start: number; end: number } | null
  selected: number | null
  autoFill: 0 | 4 | 8
  onSelect: (bar: number | null) => void
  onAutoFill: (n: 0 | 4 | 8) => void
}

export function ChordChart(p: Props) {
  const { chart, range } = p
  return (
    <section className="card">
      <h2>コードチャート</h2>
      {chart.bars.length === 0 ? (
        <p className="hint">コード進行を入力すると小節が表示されます。</p>
      ) : (
        <div className="chart" role="list">
          {chart.bars.map((bar) => {
            const fill = p.fills[bar.index]
            const auto = fill === undefined && p.autoFillBars.includes(bar.index)
            const inRange = !range || (bar.index >= range.start && bar.index < range.end)
            const cls = [
              'bar',
              p.currentBar === bar.index ? 'current' : '',
              p.selected === bar.index ? 'selected' : '',
              inRange ? '' : 'outside',
              range && bar.index === range.start ? 'range-a' : '',
              range && bar.index === range.end - 1 ? 'range-b' : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <Fragment key={bar.index}>
                {bar.section !== undefined && (
                  <div className="section-label" role="listitem">
                    {bar.section}
                  </div>
                )}
              <button
                role="listitem"
                className={cls}
                onClick={() => p.onSelect(p.selected === bar.index ? null : bar.index)}
                aria-label={`${bar.index + 1}小節目 ${bar.entries.map((e) => e.label).join(' ')}`}
              >
                <span className="num">{bar.index + 1}</span>
                <span className="chords">
                  {bar.entries.map((e, i) => (
                    <span key={i} className={e.chord ? '' : 'nc'}>
                      {e.label}
                    </span>
                  ))}
                </span>
                <span className="marks">
                  {range && bar.index === range.start && <em className="mark a">A</em>}
                  {range && bar.index === range.end - 1 && <em className="mark b">B</em>}
                  {fill !== undefined && <em className="mark fill">{SHORT[fill]}</em>}
                  {auto && <em className="mark fill auto">フィル</em>}
                </span>
              </button>
              </Fragment>
            )
          })}
        </div>
      )}
      <div className="row">
        <label>
          自動フィル
          <select value={p.autoFill} onChange={(e) => p.onAutoFill(Number(e.target.value) as 0 | 4 | 8)}>
            <option value={0}>なし</option>
            <option value={4}>4小節ごと</option>
            <option value={8}>8小節ごと</option>
          </select>
        </label>
        <span className="hint">小節をタップすると、フィルやループ範囲を設定できます。</span>
      </div>
    </section>
  )
}
