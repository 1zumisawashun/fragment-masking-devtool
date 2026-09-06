# create-draft-pr

## 概要

現在のブランチのドラフトPRを作成するスキル。

## 実行の流れ

1. ベースブランチとの差分を把握する(未コミット変更があればcommit)
2. push する
3. PRテンプレート(`.github/pull_request_template.md`)があれば読み込んで埋める。無ければSummary/Test plan中心の簡潔なフォーマットで書く
4. Assigneeが未設定(`gh pr view --json assignees`が空配列)なら1zumisawashunをアサインする。既に設定済みなら上書きしない

## 使い方

```
/create-draft-pr
```

詳細な手順・出力フォーマットは `SKILL.md` を参照。
