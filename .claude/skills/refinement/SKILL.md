---
name: refinement
description: GitHub issueの番号を渡すと、その状態を見て local-grill-me / breakdown のどちらを実行すべきか判断し、実装可能なsub-issue群が揃うところまで自動で進めるdispatcher。issueの現在地が分からないまま「とりあえずこのissueを進めたい」と言われたとき、または明示的に /refinement を呼んだときに使う。
argument-hint: <issue番号>
---

# refinement

`local-grill-me` → `breakdown` → `implement` パイプラインの入口。issue番号だけを受け取り、今
どの段階にいるかを判定して、適切な次のskillに振り分ける。`implement`（ブランチ作成・実装・
PR作成という重いアクション）へは自動で進まず、sub-issueが揃った時点で止まって報告する —
実装に進むかどうかは常にユーザーの明示的な一手にする。

## 型

- **判定原則**: issueの状態（closed / 本文が薄い / タスクグループあるがsub-issue無し /
  sub-issueあり / 自身がsub-issue）を機械的に判定し、対応するskillへ振り分ける。判定に迷う
  ケース（本文はあるが構造が崩れている）は黙って推測せずユーザーに確認する。
- **停止条件**: `local-grill-me` → `breakdown` の自動連鎖は、sub-issueが揃った時点
  （`subIssues` が存在し、判定表が「分解済み」に達する）で止まる。
- **Gate**: `implement` の判定に到達した時点で必ず止まり、どのsub-issueを実装するかは
  ユーザーの明示的な一手に委ねる。
- **ログ**: 判定結果（issueの状態・振り分け先）をチャット上で報告する。永続的なログは各段階の
  呼び出し先（issue本文／sub-issue一覧）に委ねる。

## 進め方

### 1. issueの状態を読む

```bash
gh issue view <n> --json number,title,body,url,state
```

sub-issueの有無も確認する（`--json` は `subIssues` に対応していないため GraphQL を使う）:

```bash
gh api graphql -f query='query { repository(owner:"<owner>", name:"<repo>") { issue(number: <n>) { subIssues(first: 20) { totalCount nodes { number title state } } } } }'
```

### 2. 判定して振り分ける

- **closed** — ユーザーに伝えて止まる。
- **本文が薄い/空**（`## 背景` `## 方針` `## タスク` のような構造が無い） — まだスコープされて
  いないので `Skill` ツールで `local-grill-me` を呼ぶ（引数はこのissue番号）。
- **本文に `###` タスクグループがあるが `subIssues.totalCount` が 0** — スコープ済みだが
  分解されていないので `Skill` ツールで `breakdown` を呼ぶ（引数はこのissue番号）。
- **すでに `subIssues` がある** — 分解済み。それぞれの状態（open/closed）を一覧にして報告し、
  open なものについて「`implement <sub-issue番号>` で実装できます」と伝えて止まる。
- **本文の先頭が `Part of #<親issue番号>` になっている**（＝このissue自体がsub-issue） —
  すでに実装可能な粒度なので、`implement <n>` を直接提案して止まる。

### 3. 自動で1段階だけ進めたら、状態を読み直す

`local-grill-me` または `breakdown` を呼んだ後は、その結果を踏まえて手順2の判定をやり直す
（例: `local-grill-me` が完了したら続けて `breakdown` の判定に進めてよい）。ただし
`implement` の判定に到達したら、そこで必ず止まって報告する — 自動連鎖させない。

### 4. 各段階の呼び出し方針を継承する

`local-grill-me` を呼ぶ際は、そのskillの「質問する前に調査する」「`grilling` を呼んで
インタビューする」手順にそのまま従う。`breakdown` を呼ぶ際は、そのskillの「作成前に
プレビューして確認を取る」手順にそのまま従う。`refinement` はどのskillを呼ぶかを決めるだけで、
各skill自身の進め方を上書きしない。

## 注意

- issue番号ではなくフリーテキストの「why」が渡された場合は、先に issue を作る必要があるので
  `local-grill-me` に直接渡す（`refinement` の判定ロジックは既存issueが前提）。
- 判定に迷うケース（例: 本文はあるが構造が崩れている）は、黙って推測せずユーザーに確認する。
