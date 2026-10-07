import { MIXER_KEYS, MIXER_LABELS, type MixerKey, type MixerState } from '../audio/mixer'

interface Props {
  mixer: MixerState
  onChange: (key: MixerKey, patch: Partial<MixerState[MixerKey]>) => void
}

export function MixerPanel({ mixer, onChange }: Props) {
  return (
    <section className="card">
      <h2>ミキサー</h2>
      <div className="mixer">
        {MIXER_KEYS.map((key) => {
          const ch = mixer[key]
          return (
            <div className="channel" key={key}>
              <span className="name">{MIXER_LABELS[key]}</span>
              <button
                className={`chip small ${ch.mute ? 'mute-on' : ''}`}
                aria-pressed={ch.mute}
                onClick={() => onChange(key, { mute: !ch.mute })}
                aria-label={`${MIXER_LABELS[key]}をミュート`}
              >
                ミュート
              </button>
              <button
                className={`chip small ${ch.solo ? 'solo-on' : ''}`}
                aria-pressed={ch.solo}
                onClick={() => onChange(key, { solo: !ch.solo })}
                aria-label={`${MIXER_LABELS[key]}をソロ`}
              >
                ソロ
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={ch.volume}
                onChange={(e) => onChange(key, { volume: Number(e.target.value) })}
                aria-label={`${MIXER_LABELS[key]}の音量`}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
