'use client';
import { useState } from "react";
import dynamic from "next/dynamic";
import { languageOptions } from "./utils/languages";
import OutputPanel from "./components/OuputPanel";

const MonacoEditor = dynamic(() => import("./components/Editor"));

export default function Home() {
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("Waiting for code...");

  const runCode = async () => {
    // Placeholder logic (hook to JDoodle API or backend)
    setOutput(`Running ${language.toUpperCase()} code...\nOutput: 1764`);
  };

  return (
    <main className="min-h-screen bg-[#0d1117] text-white p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          🚀 CodePilot
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-[#161b22] px-3 py-1 rounded"
          >
            {languageOptions.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          <button className="bg-blue-600 px-4 py-2 rounded" onClick={runCode}>
            ▶ Run
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonacoEditor language={language} code={code} setCode={setCode}  />
        <OutputPanel output={output} />
      </div>
    </main>
  );
}