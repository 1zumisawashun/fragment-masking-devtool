# review-fix

## 概要

Copilotと人間レビュアーのレビューコメント(CIボット等の他のbotは対象外)を収集し、各コメントに対する修正プラン(実装修正 or コメント返信)を提案して、**ユーザーが選択してから**実行するスキル。核心は「実行前に必ず人に選ばせる」対話性にある。commit・pushはユーザーが選択肢を選んだ後にしか発生しない。

## ファイル構成

本体(`SKILL.md`)には対話フローだけを残し、機械的な手順は `references/` に切り出している:

- `references/fetch-comments.md`: PR情報・レビューコメント・スレッドIDの取得手順
- `references/apply-fix.md`: Option A/B/skip それぞれの実行手順(commit・push・rebaseコンフリクト対処・PRコメント返信・スレッドresolve)

## Claude Code ビルトインの `/autofix-pr` との違い

Claude Codeには組み込みの `/autofix-pr [prompt]` コマンドがある(公式ドキュメント)。現在のブランチのPRを検出し、CIが失敗するかレビュアーがコメントを残したときに修正をプッシュする Claude Code on the web セッションを生成する。デフォルトでは「すべてのCI失敗とレビューコメントを修正する」よう指示されるが、プロンプトを渡して指示を変えられる。

このスキルとの最大の違いは確認フロー: `/autofix-pr` はデフォルトですべて自動修正・pushする一方、このスキルは全コメントについて必ずユーザーに選択させる(A: 実装修正 / B: コメント返信 / skip)。

## 使い方

```bash
# PR #8 のレビューコメントに対応
/review-fix 8

# 現在のブランチの PR に対応(PR番号を自動推測)
/review-fix
```

詳細な手順・出力フォーマットは `SKILL.md` を参照。
