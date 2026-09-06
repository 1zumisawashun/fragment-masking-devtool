# コメント取得手順

`review-fix` のStep 2（レビューコメントを取得する）で使う、PR情報・レビューコメント・スレッドIDの取得手順。手順を終えたら本体のStep 3に進む。

## PR情報の取得

args から PR 番号を読み取る。PR 番号が指定されていない場合は、現在のブランチから推測する。

```bash
# PR情報を取得（ブランチ名・作成者も含む）
gh pr view {PR_NUMBER} --json number,headRefName,baseRefName,url,author
```

`author.login` はコメントの取得・フィルタリングで使うので控えておく。

## ブランチの自動切り替え

取得した `headRefName` と現在のブランチ（`git rev-parse --abbrev-ref HEAD`）を比較する。
異なる場合は現在のブランチ名を記録してから、PRのブランチに切り替える。
作業完了後は元のブランチに戻る。

```bash
ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git checkout {headRefName}
# ... 作業 ...
git checkout $ORIGINAL_BRANCH  # 最後に必ず戻る
```

## レビューコメントの取得

```bash
gh api repos/{owner}/{repo}/pulls/{PR_NUMBER}/comments --paginate
```

対象は **Copilot と人間レビュアーのコメントのみ**。次の基準でフィルタリングする:

- `user.login` が `Copilot` または `copilot-pull-request-reviewer[bot]` → 対象（Copilot）
- `user.type` が `User`（人間アカウント） → 対象（人間レビュアー）。ただし `user.login` が上記で取得した `author.login` と一致する場合はPR作成者自身のセルフコメントなので対象外
- 上記以外（`user.type` が `Bot` で Copilot 以外、例: `github-actions[bot]` や他の CI/Lint bot） → 対象外

## スレッドIDの取得

コメント返信後のresolveに必要なスレッドnode_idを取得し、コメントIDと紐付けておく：

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!, $after: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            isResolved
            comments(first: 1) {
              nodes {
                databaseId
              }
            }
          }
        }
      }
    }
  }
' -F owner={owner} -F repo={repo} -F number={PR_NUMBER} -F after={cursor}
```

`comments.nodes[0].databaseId` がREST APIのコメントIDに対応する。
`{ comment_id: thread_node_id }` のマッピングを保持しておく。
`pageInfo.hasNextPage` が `true` の場合は `pageInfo.endCursor` を `after` に渡して再実行し、全スレッド分のマッピングが揃うまで繰り返す(101件目以降のスレッドを取りこぼさないため)。

## 返信コメントの除外

`in_reply_to_id` が `null` でないコメントは他コメントへの返信（レビュアー自身の追記や確認コメント、スレッド内の会話等）なので、修正対象から除外する。
独立したコメント（`in_reply_to_id: null`）のみを修正対象として扱う。

## 現在のコードとの差異確認

レビューコメントはブランチが更新されても outdated にならないことがある（特にCopilotのコメント）。
コメントで指摘されているコードを実際のファイルと照合し、すでに修正済みの場合は「対応済み」として扱う。
コメントが outdated（対象コードが大きく変わっている）と判断した場合は、実装修正よりスキップを推奨する。
