# sample-project

拡張の動作検証用graphql-tadaプロジェクト（Step0で構築）。

- `schema.graphql` — 最小限のスキーマ（`Staff`型）
- `src/fragments.ts` — `StaffBase` / `StaffStatus` の2つのfragment
- `src/mocks.ts` — ツールが認識すべきパターンを一通り含むmock
  - 単純なスプレッド `{...a, ...b}`
  - `merge(a, b)`（`es-toolkit`）
  - `maskFragments(fragments, data)`（`gql.tada/testing`の本物のAPI）
  - ネストケース `maskFragments(fragments, merge(a, b))`
- `src/handlers.ts` — 合成したmockを`msw`の`graphql.query(...)`ハンドラに渡す使用例
  （`@fixtures/*` path aliasでの参照）
- `tsconfig.json` — `@fixtures/*` path alias（Step3のpath解決検証用）と、
  `gql.tada/ts-plugin`の設定

## セットアップ

```bash
pnpm --filter sample-project run codegen    # schema.graphql → graphql-env.d.ts
pnpm --filter sample-project run typecheck
```
