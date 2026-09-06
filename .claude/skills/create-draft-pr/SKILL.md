---
name: create-draft-pr
description: 現在のブランチのドラフトPRを作成する。「PRを作って」「ドラフトPRを作って」「PRを出して」と言われたとき、またはレビュー依頼前の最終ステップとして使う。
allowed-tools: Bash(git log:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(gh repo view:*), Bash(gh pr view:*), Bash(gh pr create:*), Bash(gh pr edit:*), Read(.github/pull_request_template.md)
---

現在のブランチのドラフトPRを作成する。

## 1. 変更内容を把握する

- `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` でベースブランチを確認する
- `git diff <base>..<current>` でブランチ間の差分を確認する
- 未コミットの変更があるかを確認する
- 作業の流れから変更内容がすでに把握できている場合は、この手順を省略してよい

## 2. コミットする(未コミット変更がある場合のみ)

- レビュワーが理解しやすい粒度でコミットを作成する
- 未コミット変更がなければ、この手順を省略する

## 3. プッシュする

```bash
git push -u origin HEAD
```

## 4. PRを作成する

`.github/pull_request_template.md` が存在すればそれを読み込んでテンプレートを埋める。存在しなければ、Summary(変更内容)とTest plan(動作確認したこと)を中心にした簡潔な自前フォーマットで書く。

optional項目を設ける場合、内容がなければ「記載なし」と明記する(空の箇条書きや形式だけの文章で埋めない)。

```bash
gh pr create \
  --draft \
  --base <base-branch> \
  --title "<title>" \
  --body "<body>"
```

## 5. Assigneeが未設定なら自分をアサインする

```bash
gh pr view <pr-url> --json assignees --jq '.assignees'
```

空配列(Assigneeなし)の場合のみ、1zumisawashunをアサインする。

```bash
gh pr edit <pr-url> --add-assignee 1zumisawashun
```

既にAssigneeが設定されている場合は上書きしない。

成功したらPRのURLをユーザーに伝える。
