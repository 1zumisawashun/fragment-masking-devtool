# local-grill-me について

`local-grill-me` は `scope → breakdown → implement`（入口として `refinement`）という
GitHub issue駆動パイプラインの1段階目。[mattpocock/skills](https://github.com/mattpocock/skills)
の `grill-me` / `grilling`（MIT License, Copyright (c) 2026 Matt Pocock）を、GitHub issueの
調査・書き戻しに合わせて手を加えたもの。

## なぜ `grilling` を直接呼んでいて `grill-me` を経由しないのか

`grill-me` の中身は次の1行だけ。

```
Run a /grilling session.
```

つまり `grill-me` は「`grilling` を呼ぶだけの薄いラッパー」であり、実際のインタビュー技法
（design tree / rounds / frontier）は全て `grilling` 側にある。加えて `grill-me` の
frontmatterには `disable-model-invocation: true` が付いている。これは「ユーザーが
`/grill-me` と直接打つことを前提としたエントリポイントであり、Claudeが自分の判断で
自動的に呼び出すことは想定されていない」というフラグ。

`local-grill-me` はskillの内部処理として質問インタビューが必要なだけで、ユーザーが
`/grill-me` を直接叩く体験を提供したいわけではない。`grill-me` を経由しても最終的に
やっていることは「`grilling` を呼ぶ」だけなので、そのまま `grilling` を直接呼んでいる。

```
ユーザーが /local-grill-me を実行
        │
        ▼
local-grill-me（プロジェクト、このリポジトリの .claude/skills/）
  issue調査 → grilling を直接呼ぶ → issue下書き・書き戻し
        │
        ▼
      grilling（グローバル、~/.claude/skills/grilling）
      実際の質問インタビュー技法（design tree / rounds / frontier）

# 別経路（このパイプラインとは独立）
ユーザーが /grill-me を直接実行 → grilling を呼ぶ（issueと無関係な汎用プランニング用）
```

`grill-me` はこのパイプラインとは無関係に、issueを介さない汎用の壁打ち用としてユーザーが
直接叩ける入口として単独でも存在している（`~/.claude/skills/grill-me`）。

## `grilling` / `grill-me` の実体はどこにあるか

どちらもプロジェクトには含めず、`gh skill install`（GitHub CLIのネイティブ機能, 2026年4月〜）
で `--scope user` としてグローバルに導入している。

```bash
gh skill install mattpocock/skills skills/productivity/grilling --agent claude-code --scope user
gh skill install mattpocock/skills skills/productivity/grill-me --agent claude-code --scope user
```

実体は `~/.claude/skills/grilling/SKILL.md` と `~/.claude/skills/grill-me/SKILL.md`。
プロジェクトにベタ書きでコピーしなかったのは、Matt側の更新に追従したかったため。

```bash
gh skill update --all
```

で最新化できる（`gh skill install` 時にfrontmatterへ埋め込まれる `github-repo` /
`github-ref` / `github-tree-sha` のメタデータで追跡している）。

## local-grill-me が変更している点

`grilling` の設計手法（design tree / frontier / 事実探しはagentの仕事）自体はそのまま使うが、
1ラウンドあたりの質問の出し方だけ、往復を減らすために独自の「質問フォーマット」に置き換えている
（独立した論点はバッチ化して想定回答を明記し、沈黙は承認とみなす。依存関係のある論点だけ
1つずつ尋ねる）。詳細は [`SKILL.md`](./SKILL.md) の「質問フォーマット」セクションを参照。
