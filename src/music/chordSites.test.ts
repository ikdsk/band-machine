import { describe, expect, it } from 'vitest'
import { CHORD_SITES, chordSearchUrl } from './chordSites'

describe('chordSearchUrl', () => {
  it('曲名をエンコードして site: 検索の URL にする', () => {
    const ufret = CHORD_SITES.find((s) => s.id === 'ufret')!
    expect(chordSearchUrl(ufret, 'テスト 曲&名')).toBe(
      'https://www.google.com/search?q=%E3%83%86%E3%82%B9%E3%83%88%20%E6%9B%B2%26%E5%90%8D+%E3%82%B3%E3%83%BC%E3%83%89+site:ufret.jp',
    )
  })

  it('4 サイトぶんある', () => {
    expect(CHORD_SITES.map((s) => s.name)).toEqual(['U-FRET', 'J-Total Music', '楽器.me', 'ChordWiki'])
    for (const s of CHORD_SITES) expect(chordSearchUrl(s, 'abc')).toContain(`site:${s.domain}`)
  })

  it('空の曲名は null', () => {
    expect(chordSearchUrl(CHORD_SITES[0], '  ')).toBeNull()
  })
})
