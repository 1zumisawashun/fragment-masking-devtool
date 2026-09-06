import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import { executeTopLevelVariables } from "./executeTopLevelVariables.js";
import { parseTopLevelVariableNames } from "./parseTopLevelVariables.js";

type WebviewMessage =
  | {
      type: "topLevelVariables";
      fileName: string;
      variables: {
        name: string;
        value: unknown;
        overrides?: { path: string; overriddenBy: string[] }[];
      }[];
    }
  | { type: "error"; text: string };

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    "fragmentMock.visualizeOverrides",
    (uri?: vscode.Uri) => {
      const panel = vscode.window.createWebviewPanel(
        "fragmentMock",
        "Fragment Mock: 上書きを可視化",
        vscode.ViewColumn.Beside,
        { enableScripts: true },
      );

      panel.webview.html = buildWebviewHtml(panel.webview, context);

      panel.webview.onDidReceiveMessage((message: { type: string }) => {
        if (message.type === "ready") {
          panel.webview.postMessage(buildTopLevelVariablesMessage(uri, context));
        }
      });
    },
  );

  context.subscriptions.push(disposable);
}

export function deactivate(): void {}

function buildTopLevelVariablesMessage(
  uri: vscode.Uri | undefined,
  context: vscode.ExtensionContext,
): WebviewMessage {
  if (!uri) {
    return { type: "error", text: "対象ファイルが選択されていません" };
  }

  try {
    const sourceText = readFileSync(uri.fsPath, "utf-8");
    const variableNames = parseTopLevelVariableNames(uri.fsPath, sourceText);
    const trackMergeModulePath = vscode.Uri.joinPath(context.extensionUri, "src", "trackMerge.ts").fsPath;
    const { values, overridesByName } = executeTopLevelVariables(
      uri.fsPath,
      sourceText,
      variableNames,
      trackMergeModulePath,
    );
    const variables = variableNames.map((name) => ({
      name,
      value: values[name],
      overrides: overridesByName[name],
    }));

    return { type: "topLevelVariables", fileName: uri.fsPath, variables };
  } catch (error) {
    return { type: "error", text: error instanceof Error ? error.message : String(error) };
  }
}

function buildWebviewHtml(webview: vscode.Webview, context: vscode.ExtensionContext): string {
  // Step1時点ではworkspace内の兄弟パッケージとして読む前提(vsceでのパッケージングはまだ未対応)。
  const distUri = vscode.Uri.joinPath(context.extensionUri, "..", "webview-ui", "dist");
  const html = readFileSync(vscode.Uri.joinPath(distUri, "index.html").fsPath, "utf-8");
  const nonce = randomBytes(16).toString("base64");

  return html
    .replace(/(src|href)="\.\/(.+?)"/g, (_match, attr: string, relativePath: string) => {
      const assetUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, relativePath));
      return `${attr}="${assetUri.toString()}"`;
    })
    .replace(/<script /g, `<script nonce="${nonce}" `)
    .replace(
      "</head>",
      `  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">\n  </head>`,
    );
}
