import { useEffect, useState } from "react";
import { getVsCodeApi } from "./vscodeApi";
import { ValueNode } from "./ValueNode";

type ExtensionMessage =
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

export function App() {
  const [message, setMessage] = useState<ExtensionMessage | undefined>();

  useEffect(() => {
    const vscode = getVsCodeApi();

    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
      setMessage(event.data);
    };
    window.addEventListener("message", handleMessage);

    vscode.postMessage({ type: "ready" });

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <main>
      <h1>Fragment Mock Viewer</h1>
      {message === undefined && <p>解析結果を待っています...</p>}
      {message?.type === "error" && <p>{message.text}</p>}
      {message?.type === "topLevelVariables" && (
        <>
          <p>{message.fileName}</p>
          <ul>
            {message.variables.map(({ name, value, overrides }) => (
              <li key={name}>
                <ValueNode
                  label={name}
                  value={value}
                  path=""
                  overriddenByPath={
                    new Map(overrides?.map((override) => [override.path, override.overriddenBy]))
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
