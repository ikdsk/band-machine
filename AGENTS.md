# Development operating rules — バンドマシン

楽器練習用バッキング生成・演奏アプリ。仕様は `docs/spec.md`。

## Model assignment
- Coordinator: Claude Opus 5.5（レビュー・検証・配信のみ）。実装: Claude Sonnet 5.5 サブエージェント。
- One agent = one branch = one git worktree in `/Users/dikeda/workspace/band-machine-worktrees/<role>`.

## Quality
- 生成ロジック（コードパーサ、ボイシング、パターン生成、フィル配置）は純粋関数で TDD（Vitest）。
- 音の再生層（Tone.js）はロジックと分離。モック再生のテストは「実際の音」を証明しない旨を報告に明記。
- `npm run build` と `npm test` が通ること。
- UI 文言は自然な日本語。機能重視でシンプル。

## Process
- 進捗・検証結果・不具合は GitHub Issues (`ikdsk/band-machine`) に反映する。
- コミットは日本語メッセージ、末尾に `Refs #<issue>`。push/merge は coordinator が行う。
- `git add .` 禁止（node_modules や dist を入れない）。
- 他プロジェクトの dev サーバーを止めない（`pkill -f vite` 禁止）。確認用サーバーは自分で起動したものだけ止める。
