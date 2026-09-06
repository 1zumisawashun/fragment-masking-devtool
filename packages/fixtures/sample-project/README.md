# sample-project

Step0で構築する、拡張の動作検証用graphql-tadaプロジェクト。現時点では骨子(package.jsonのみ)。

想定する依存(Step0で追加):

- `gql.tada` / `graphql` — fragment maskingの検証対象
- `es-toolkit` — mocks.ts内の `merge()` の実装
- `msw` — 合成したmockをGraphQLレスポンスとして返すハンドラの実例
