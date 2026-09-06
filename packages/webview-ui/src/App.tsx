import { useEffect, useState } from "react";
import { getVsCodeApi } from "./vscodeApi";

type ExtensionMessage = {
  type: "hello";
  text: string;
};

export function App() {
  const [receivedText, setReceivedText] = useState<string | undefined>();

  useEffect(() => {
    const vscode = getVsCodeApi();

    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
      if (event.data.type === "hello") {
        setReceivedText(event.data.text);
      }
    };
    window.addEventListener("message", handleMessage);

    vscode.postMessage({ type: "ready" });

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <main>
      <h1>Fragment Mock Viewer</h1>
      <p>Step1: 拡張との疎通確認用ダミー画面</p>
      <p>{receivedText ? `拡張からの応答: ${receivedText}` : "拡張からの応答を待っています..."}</p>
    </main>
  );
}
