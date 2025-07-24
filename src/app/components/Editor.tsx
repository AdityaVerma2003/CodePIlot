'use client';
import Editor from "@monaco-editor/react";
import { useEffect } from "react";
import { loader } from "@monaco-editor/react";

export default function CodeEditor({ language, code, setCode }: any) {
  useEffect(() => {
    loader.init().then((monaco) => {
      monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
      monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
    });
  }, []);

  return (
    <div className="bg-[#161b22] rounded p-2">
      <Editor
        height="60vh"
        theme="vs-dark"
        defaultLanguage={language}
        value={code}
        onChange={(value) => setCode(value)}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: "on",
          automaticLayout: true,
          scrollBeyondLastLine: false,
          lineNumbers: "on",
          renderLineHighlight: "all",
          contextmenu: true,
          tabSize: 2,
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
        }}
        loading={<div className="text-white">Loading editor...</div>}
      />
    </div>
  );
}