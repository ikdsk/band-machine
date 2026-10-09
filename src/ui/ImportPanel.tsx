import { useMemo, useState } from 'react'
import { CHORD_SITES, chordSearchUrl } from '../music/chordSites'
import { DEFAULT_IMPORT_OPTIONS, type ImportOptions, importChords } from '../music/importChords'

interface Props {
  onApply: (text: string) => void
  onCancel: () => void
}

export function ImportPanel({ onApply, onCancel }: Props) {
  const [raw, setRaw] = useState('')
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState<ImportOptions>(DEFAULT_IMPORT_OPTIONS)
  const result = useMemo(() => importChords(raw, options), [raw, options])
  const hasInput = raw.trim() !== ''

  return (
    <div className="import-panel">
      <h3>コード譜を貼り付け</h3>
      <p className="hint">コード譜サイトからコピーして貼り付けると、コードだけを取り出します。</p>

      <div className="import-search">
        <label>
          曲名で探す
          <input type="search" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="曲名（アーティスト名）" />
        </label>
        <div className="import-links">
          {CHORD_SITES.map((site) => {
            const url = chordSearchUrl(site, title)
            return url ? (
              <a key={site.id} className="chip small" href={url} target="_blank" rel="noopener">
                {site.name}
              </a>
            ) : (
              <span key={site.id} className="chip small disabled" aria-disabled="true">
                {site.name}
              </span>
            )
          })}
        </div>
        <p className="hint">検索結果が新しいタブで開きます。このアプリはサイトの内容を取得しません。</p>
      </div>

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={8}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label="コード譜のテキスト"
        placeholder={'ここに貼り付け（例）\n[Aメロ]\nC      G\nあいうえお\n[サビ]\n| Am F | C G | ×2'}
      />

      <div className="row">
        <label>
          1小節あたりのコード数
          <select
            value={String(options.chordsPerBar)}
            onChange={(e) => {
              const v = e.target.value
              setOptions({ ...options, chordsPerBar: v === 'auto' ? 'auto' : v === '2' ? 2 : 1 })
            }}
          >
            <option value="auto">自動</option>
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.capoTranspose}
            onChange={(e) => setOptions({ ...options, capoTranspose: e.target.checked })}
          />
          カポぶん移調して実音にする
        </label>
      </div>
      <p className="hint">小節線（|）がある譜面は、その区切りに従います。</p>

      {hasInput && (
        <div className="import-preview">
          <h3>変換結果</h3>
          <p className="hint">
            セクション {result.sections.filter((s) => s.name !== '').length}・コード {result.chordCount}・小節{' '}
            {result.sections.reduce((n, s) => n + s.bars.length, 0)}
          </p>
          <pre aria-label="変換後の進行">{result.text || '（コードが見つかりません）'}</pre>
          {result.warnings.length > 0 && (
            <ul className="errors" aria-label="警告">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="row">
        <button className="chip seg on" disabled={result.chordCount === 0} onClick={() => onApply(result.text)}>
          この進行を使う
        </button>
        <button className="chip" onClick={onCancel}>
          キャンセル
        </button>
        <span className="hint">いまの進行は置き換わります。</span>
      </div>
    </div>
  )
}
