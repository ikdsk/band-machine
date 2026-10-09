// コード譜サイトの検索ページへのリンクを組み立てる（サイトの内容は取得しない）。
// 検索 URL の形式が確実でないため、すべて Google の site: 検索にする。

export interface ChordSite {
  id: string
  name: string
  domain: string
}

export const CHORD_SITES: ChordSite[] = [
  { id: 'ufret', name: 'U-FRET', domain: 'ufret.jp' },
  { id: 'jtotal', name: 'J-Total Music', domain: 'j-total.net' },
  { id: 'gakki', name: '楽器.me', domain: 'gakki.me' },
  { id: 'chordwiki', name: 'ChordWiki', domain: 'chordwiki.org' },
]

/** 曲名からサイトごとの検索 URL を作る。曲名が空なら null */
export function chordSearchUrl(site: ChordSite, title: string): string | null {
  const q = title.trim()
  if (q === '') return null
  return `https://www.google.com/search?q=${encodeURIComponent(q)}+${encodeURIComponent('コード')}+site:${site.domain}`
}
