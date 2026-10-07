import { GENRES, getGenre, getVariant } from '../styles'

interface Props {
  variantId: string
  onVariant: (id: string, genreChanged: boolean) => void
}

export function StylePicker({ variantId, onVariant }: Props) {
  const variant = getVariant(variantId)
  const genre = getGenre(variant.genreId)
  return (
    <section className="card">
      <h2>ジャンル</h2>
      <div className="chips" role="tablist" aria-label="ジャンル">
        {GENRES.map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={g.id === genre.id}
            className={`chip ${g.id === genre.id ? 'on' : ''}`}
            onClick={() => g.id !== genre.id && onVariant(g.variants[0].id, true)}
          >
            {g.name}
          </button>
        ))}
      </div>
      <div className="chips variants" role="tablist" aria-label="バリエーション">
        {genre.variants.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={v.id === variant.id}
            className={`chip seg ${v.id === variant.id ? 'on' : ''}`}
            onClick={() => onVariant(v.id, false)}
          >
            {v.name}
          </button>
        ))}
      </div>
      <p className="hint">{variant.description}（推奨テンポ {variant.bpm}）</p>
    </section>
  )
}
