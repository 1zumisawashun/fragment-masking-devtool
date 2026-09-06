# Fragment Mock Viewer

graphql-tada の fragment masking を使った mock データで、`{...a, ...b}` のスプレッドや
`merge()` / `maskFragments()` によるマージ処理を通した際に、**どのフィールドがどのソースから来て、
どこで上書きされたか**を可視化する VS Code 拡張。

対象ファイルを右クリックすると、ファイル内のトップレベル `const` 変数を実際に実行して値を取得し、
スプレッド構文や設定済みの関数呼び出し(`merge`, `maskFragments` など)で合成されたオブジェクトについては、
各フィールドがどの変数(ソース)由来か・上書きされているかを Webview のツリーに表示する。

## 現在の状態

v1 スコープ(issue [#1](https://github.com/1zumisawashun/fragment-masking-devtool/issues/1),
Step0〜Step5)は実装完了・全 PR マージ済み。

- Step0: 検証用 fixture プロジェクト(`packages/fixtures/sample-project`)の構築
- Step1: VS Code 拡張の雛形(右クリックメニュー → コマンド発火 → Webview 表示)
- Step2: TypeScript Compiler API でトップレベル `const` 宣言を検出し、変数名一覧をツリー表示
- Step3: 拡張に内蔵したトランスパイラ(esbuild)で対象ファイルを子プロセス実行し、実際の値を表示
- Step4: 単純な識別子スプレッド(`{...a, ...b}`)の由来トラッキング(上書きキーに ⚠ バッジ表示)
- Step5: `.fragmentmockrc.json` で設定した関数呼び出し(`merge`, `maskFragments` など)の由来トラッキング、
  ネストしたマージ呼び出し(`maskFragments(fragments, merge(a, b))`)のprovenance合成

未対応・将来課題(意図的にスコープ外):

- monorepo など複雑なモジュール解決ケースへの対応
- 実行方式の常駐プロセス化(現状は右クリックのたびに子プロセスを spawn するシンプル方式)
- 大きいファイルでツリーが肥大化した場合のパフォーマンス・UI設計
- VS Code拡張としての正式パッケージング(`vsce`)。現状は本リポジトリをワークスペースとして開き、
  ワークスペース内の兄弟パッケージ(`packages/webview-ui/dist` など)をそのまま読みに行く前提で動く

## リポジトリ構成

pnpm workspace。

- `packages/extension` — 拡張本体(Node.js, プレーンTypeScript)。AST解析・子プロセス実行・
  provenance トラッキングのロジックもここ
- `packages/webview-ui` — Webview UI(React + TypeScript, Vite でビルド)
- `packages/fixtures/sample-project` — 動作検証用の graphql-tada プロジェクト。
  拡張が認識すべき全パターン(スプレッド / `merge()` / `maskFragments()` / ネスト)を含む

## セットアップ

```bash
corepack enable   # package.json の packageManager (pnpm@10.28.0) を有効化
pnpm install
```

## ローカルで動かす(VS Code 拡張として起動)

拡張本体とWebviewは別々にビルドが必要(拡張はWebviewの`dist`を実行時に読みに行くため、
Webview側を先にビルドしておく)。

```bash
pnpm --filter webview-ui build
pnpm --filter fragment-mock-viewer build
```

その後、**リポジトリのルート(`fragment-masking-devtool/`)を VS Code で開き**、
`.vscode/launch.json` の "Run Extension" 構成で `F5`(またはRun and Debugパネルから実行)。
これで拡張が有効化された状態の「Extension Development Host」という別ウィンドウが開く。

コード変更後に反映するには、上記2つの build コマンドを再実行してから
Extension Development Host ウィンドウを再読み込み(`Cmd+R` / `Developer: Reload Window`)する。

## 使い方(動作確認)

1. Extension Development Host ウィンドウで、`packages/fixtures/sample-project` フォルダを開く
   (`File > Open Folder...`)
2. エクスプローラーで `src/mocks.ts` を右クリック →
   **「Fragment Mock: 上書きを可視化」** を選択
3. 右側に Webview パネルが開き、`mocks.ts` 内のトップレベル変数(`staffBaseMock`,
   `staffSpreadMock`, `staffMergeMock`, `staffMaskedMock`, `staffMaskedNestedMock` など)が
   ツリー表示される
4. `staffSpreadMock` / `staffMergeMock` / `staffMaskedMock` / `staffMaskedNestedMock` を展開すると、
   `status.detail` キーに `⚠1` バッジが付いているはず(`staffBaseMock` の値が
   `staffStatusMock` によって上書きされたことを示す。バッジにカーソルを合わせると、
   上書き元のラベルがツールチップで見える)

同じフォルダの `src/handlers.ts` を右クリックすれば、`@fixtures/*` という tsconfig の
path alias 経由でのインポートも解決されることを確認できる。

## 設定ファイル `.fragmentmockrc.json`

対象プロジェクトのルート(拡張が対象ファイルから遡って最初に見つけた `tsconfig.json` のある
ディレクトリ)に置く。`packages/fixtures/sample-project/.fragmentmockrc.json` が実例。

```json
{
  "mergeFunctions": [
    { "name": "merge", "argsAreSources": "all" },
    { "name": "maskFragments", "argsAreSources": [1] }
  ]
}
```

- `name`: 呼び出し時のローカル識別子名でマッチ(importパスまでは見ない)
- `argsAreSources`: `"all"`(全引数をソース化) または `[1]`(指定indexのみソース化)
- 設定ファイルが無い場合は、単純な識別子スプレッド(`{...a, ...b}`)のみを対象とする
  フォールバック動作になる
