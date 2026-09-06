# 修正の適用手順

`review-fix` のStep 5（選択に基づいて実行）で使う、Option A・Option B・skip の具体的な実行手順。

## Option A を選択したコメント（実装修正）

1. **コードを修正**
   - Edit/Write ツールを使用
   - 複数のコメントをまとめて1つのコミットにする
   - 対象ファイルが存在しない場合や修正内容が不明確な場合は、実装修正を諦めてオプションB（コメント返信）に切り替えるか、ユーザーに確認する

2. **変更を確認**

   ```bash
   git diff
   ```

3. **コミット**

   ```bash
   git add {修正したファイル}
   git commit -m "fix: レビュー指摘に対応

   - コメント #1: {要約}
   - コメント #2: {要約}
   ...

   Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
   ```

4. **プッシュ**

   コミット後はプッシュを実行する。リモートに変更がある場合は `git pull --rebase` してからプッシュする。

   ```bash
   git push
   ```

   プッシュ前に `git pull --rebase` が必要な場合（リモートが進んでいる場合）：

   ```bash
   git pull --rebase
   # コンフリクトが発生した場合は解消してから
   git push
   ```

   **rebase コンフリクト発生時の対処**

   コンフリクトが発生したらファイルの内容を確認し、修正内容を正とする側（ours/theirs）を判断して解消する。
   解消後は `git add {ファイル}` してから `git rebase --continue` を実行する。
   すでにファイルが正しい状態になっている場合（ツールが自動解消済み）は `git rebase --continue` のみでよい。

5. **PRコメントに返信**

   各コメントに対して返信する。エンドポイントは `pulls/{PR_NUMBER}/comments/{comment_id}/replies` を使用する（`pulls/comments/{comment_id}/replies` は誤り）：

   ```bash
   gh api \
     --method POST \
     "repos/{owner}/{repo}/pulls/{PR_NUMBER}/comments/{comment_id}/replies" \
     -f body="修正しました。

   コミット: {commit_sha} ({commit_link})

   変更内容:
   - {変更の要約}"
   ```

6. **スレッドをresolve**

   返信後、`fetch-comments.md`の「スレッドIDの取得」で取得済みの `{comment_id: thread_node_id}` マッピングから対応するスレッドIDを引いて、会話スレッドをresolveする：

   ```bash
   gh api graphql -f query='
     mutation($threadId: ID!) {
       resolveReviewThread(input: {threadId: $threadId}) {
         thread {
           id
           isResolved
         }
       }
     }
   ' -F threadId="{thread_node_id}"
   ```

## Option B を選択したコメント（コメント返信）

提案した返信文を使って PR コメントに返信し、そのままスレッドをresolveする：

```bash
gh api \
  --method POST \
  "repos/{owner}/{repo}/pulls/{PR_NUMBER}/comments/{comment_id}/replies" \
  -f body="{提案した返信文}"

gh api graphql -f query='
  mutation($threadId: ID!) {
    resolveReviewThread(input: {threadId: $threadId}) {
      thread {
        id
        isResolved
      }
    }
  }
' -F threadId="{thread_node_id}"
```

## 共通: `gh api` 呼び出しのリトライ

返信POST・resolve mutationを問わず、`gh api` 呼び出しが失敗した場合は最大3回までリトライする。3回失敗した場合はそのコメントを「手動対応が必要」としてStep 7の最終レポートに含める。

## skip を選択したコメント

何もせず、スキップしたことを記録して最終レポートに含める。
