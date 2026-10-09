import { useState } from 'react'
import type { ParseError } from '../music/progression'
import { ImportPanel } from './ImportPanel'
import { PRESETS, type Preset } from './presets'

const KEY_LABELS = ['-6', '-5', '-4', '-3', '-2', '-1', '±0', '+1', '+2', '+3', '+4', '+5', '+6']

interface Props {
  text: string
  errors: ParseError[]
  beatsPerBar: 3 | 4
  transpose: number
  onText: (t: string) => void
  onPreset: (p: Preset) => void
  onBeats: (b: 3 | 4) => void
  onTranspose: (n: number) => void
}

export function ProgressionEditor(p: Props) {
  const [importing, setImporting] = useState(false)
  return (
    <section className="card">
      <h2>コード進行</h2>
      <div className="presets">
        {PRESETS.map((x) => (
          <button key={x.name} className="chip" onClick={() => p.onPreset(x)}>
            {x.name}
          </button>
        ))}
        <button className="chip import-open" aria-expanded={importing} onClick={() => setImporting(!importing)}>
          コード譜を貼り付け
        </button>
      </div>
      {importing && (
        <ImportPanel
          onApply={(text) => {
            p.onText(text)
            setImporting(false)
          }}
          onCancel={() => setImporting(false)}
        />
      )}
      <textarea
        value={p.text}
        onChange={(e) => p.onText(e.target.value)}
        rows={5}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label="コード進行"
        aria-invalid={p.errors.length > 0}
        placeholder="| C | G | Am | F |"
      />
      {p.errors.length > 0 && (
        <ul className="errors" role="alert">
          {p.errors.map((e, i) => (
            <li key={i}>
              {e.length > 0 ? `${e.bar + 1}小節目: ` : ''}
              {e.message}
              {e.length > 0 && <code>{p.text.slice(e.start, e.start + e.length)}</code>}
            </li>
          ))}
        </ul>
      )}
      <p className="hint">小節は「|」で区切り、1小節内のコードは空白区切りで拍を等分します。「%」「-」は前のコードの継続、「N.C.」は休みです。「#」で始まる行はメモ（セクション名）になります。</p>
      <div className="row">
        <label>
          拍子
          <select value={p.beatsPerBar} onChange={(e) => p.onBeats(Number(e.target.value) === 3 ? 3 : 4)}>
            <option value={4}>4/4</option>
            <option value={3}>3/4</option>
          </select>
        </label>
        <label>
          キー（移調）
          <select value={p.transpose} onChange={(e) => p.onTranspose(Number(e.target.value))}>
            {KEY_LABELS.map((l, i) => (
              <option key={l} value={i - 6}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
