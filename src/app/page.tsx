'use client';
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { languageOptions } from "./utils/languages";
import OutputPanel from "./components/OuputPanel";
import AISuggestions from "./components/AISuggestions";
import CollaborationModal from "./components/CollaborationModal";
import axios from "axios";
import { Users } from "lucide-react";

const MonacoEditor = dynamic(() => import("./components/Editor"));

// Judge0 Language ID mapping
const LANGUAGE_ID_MAP: { [key: string]: number } = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  csharp: 51,
  php: 68,
  ruby: 72,
  go: 60,
  rust: 73,
  typescript: 74,
  swift: 83,
  kotlin: 78,
};

interface OutputDetails {
  status: {
    id: number;
    description: string;
  };
  compile_output?: string;
  stdout?: string;
  stderr?: string;
  time?: string;
  memory?: string;
  token?: string;
}

export default function Home() {
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(`// Welcome to CodePilot! 🚀
// Click the Collaborate button to start coding with friends!

// Try the collaboration features:
// 1. Click 'Collaborate' to create or join a room
// 2. Share the room ID with friends
// 3. Code together in real-time!

console.log("Hello, World!");

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci sequence:");
for (let i = 0; i < 10; i++) {
  console.log(fibonacci(i));
}`);
  const [processing, setProcessing] = useState(false);
  const [outputDetails, setOutputDetails] = useState<OutputDetails | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [showCollabModal, setShowCollabModal] = useState(false);

  // Check for room parameter in URL on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      setShowCollabModal(true);
    }
  }, []);

  const runCode = async () => {
    if (!code.trim()) {
      alert("Please write some code before running!");
      return;
    }
    
    if (!LANGUAGE_ID_MAP[language]) {
      alert(`Language ${language} is not supported yet!`);
      return;
    }
    
    handleCompile();
  };

  const handleCompile = () => {
    setProcessing(true);
    setOutputDetails(null);
    setDebugInfo("Starting compilation...");
    
    const languageId = LANGUAGE_ID_MAP[language];


    
    const formData = {
      language_id: languageId,
      source_code: btoa(unescape(encodeURIComponent(code))),
      stdin: btoa(""),
    };
    
    console.log("Sending to Judge0:", {
      language_id: languageId,
      language_name: language,
      source_code_length: code.length,
      base64_encoded: true
    });
    
    setDebugInfo(`Submitting ${language} (ID: ${languageId}) code...`);
    
    const options = {
      method: "POST",
      url: "https://judge0-ce.p.rapidapi.com/submissions",
      params: { 
        base64_encoded: "true", 
        fields: "*" 
      },
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        "X-RapidAPI-Key": "4acb8c3627msh52c071e0f2f02b6p10fae2jsn009c36756a2b",
      },
      data: formData,
    };

    axios
      .request(options)
      .then(function (response) {
        console.log("Judge0 Response:", response.data);
        const token = response.data.token;
        
        if (!token) {
          throw new Error("No token received from Judge0 API");
        }
        
        setDebugInfo(`Code submitted successfully. Token: ${token}`);
        checkStatus(token);
      })
      .catch((err) => {
        console.error("Judge0 API Error:", err);
        
        let errorMessage = "Unknown error occurred";
        
        if (err.response) {
          console.error("Response data:", err.response.data);
          console.error("Response status:", err.response.status);
          errorMessage = err.response.data?.error || `HTTP ${err.response.status}: ${err.response.statusText}`;
        } else if (err.request) {
          errorMessage = "No response from server. Check your internet connection.";
        } else {
          errorMessage = err.message;
        }
        
        setProcessing(false);
        setDebugInfo(`Error: ${errorMessage}`);
        setOutputDetails({
          status: { id: -1, description: "API Error" },
          stderr: btoa(`API Error: ${errorMessage}`)
        });
      });
  };

  const checkStatus = async (token: string) => {
    const options = {
      method: "GET",
      url: `https://judge0-ce.p.rapidapi.com/submissions/${token}`,
      params: { 
        base64_encoded: "true", 
        fields: "*" 
      },
      headers: {
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        "X-RapidAPI-Key": "4acb8c3627msh52c071e0f2f02b6p10fae2jsn009c36756a2b",
      },
    };
    
    try {
      let response = await axios.request(options);
      console.log("Status check response:", response.data);
      
      let statusId = response.data.status?.id;
      let statusDescription = response.data.status?.description;

      setDebugInfo(`Status: ${statusDescription} (ID: ${statusId})`);

      if (statusId === 1 || statusId === 2) {
        setTimeout(() => {
          checkStatus(token);
        }, 2000);
        return;
      } else {
        setProcessing(false);
        setOutputDetails(response.data);
        setDebugInfo(`Execution completed. Status: ${statusDescription}`);
        return;
      }
    } catch (err) {
      console.error("Status check error:", err);
      setProcessing(false);
      setDebugInfo(`Status check failed: ${err}`);
      setOutputDetails({
        status: { id: -1, description: "Status check failed" },
        stderr: btoa("Failed to get execution results. Please try again.")
      });
    }
  };

  const getOutput = (outputDetails: OutputDetails | null) => {
    if (!outputDetails) {
      return (
        <div className="px-2 py-1 font-normal text-xs text-gray-400">
          {processing ? "Code is running..." : "Waiting for code..."}
        </div>
      );
    }

    let statusId = outputDetails.status?.id;

    if (statusId === 6) {
      return (
        <pre className="px-2 py-1 font-normal text-xs text-red-500 whitespace-pre-wrap">
          <strong>Compilation Error:</strong>
          {"\n"}
          {outputDetails.compile_output ? atob(outputDetails.compile_output) : "Compilation failed"}
        </pre>
      );
    } else if (statusId === 3) {
      const stdout = outputDetails.stdout ? atob(outputDetails.stdout) : "";
      const stderr = outputDetails.stderr ? atob(outputDetails.stderr) : "";
      
      return (
        <div className="px-2 py-1 font-normal text-xs">
          {stdout && (
            <pre className="text-green-500 whitespace-pre-wrap mb-2">
              <strong>Output:</strong>
              {"\n"}
              {stdout}
            </pre>
          )}
          {stderr && (
            <pre className="text-yellow-500 whitespace-pre-wrap">
              <strong>Stderr:</strong>
              {"\n"}
              {stderr}
            </pre>
          )}
          {!stdout && !stderr && (
            <pre className="text-gray-400">No output</pre>
          )}
        </div>
      );
    } else if (statusId === 5) {
      return (
        <pre className="px-2 py-1 font-normal text-xs text-red-500">
          <strong>Time Limit Exceeded</strong>
        </pre>
      );
    } else if (statusId === 4) {
      return (
        <pre className="px-2 py-1 font-normal text-xs text-yellow-500">
          <strong>Wrong Answer</strong>
        </pre>
      );
    } else if (statusId === 11 || statusId === 12 || statusId === 13) {
      return (
        <pre className="px-2 py-1 font-normal text-xs text-red-500 whitespace-pre-wrap">
          <strong>Runtime Error:</strong>
          {"\n"}
          {outputDetails.stderr ? atob(outputDetails.stderr) : "Runtime error occurred"}
        </pre>
      );
    } else {
      return (
        <pre className="px-2 py-1 font-normal text-xs text-red-500 whitespace-pre-wrap">
          <strong>Error (Status {statusId}):</strong>
          {"\n"}
          {outputDetails.stderr ? atob(outputDetails.stderr) : `Unknown error occurred`}
        </pre>
      );
    }
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
            className="bg-[#161b22] px-3 py-1 rounded border border-gray-600"
            disabled={processing}
          >
            {languageOptions.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label} 
              </option>
            ))}
          </select>
          
          {/* Collaborate Button */}
          <button
            onClick={() => setShowCollabModal(true)}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Collaborate</span>
          </button>
          
          <button 
            className={`px-4 py-2 rounded transition-colors ${
              processing 
                ? "bg-gray-600 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700"
            }`} 
            onClick={runCode}
            disabled={processing}
          >
            {processing ? "⏳ Running..." : "▶ Run"}
          </button>
        </div>
      </header>

      {/* Debug Info Panel */}
      {debugInfo && (
        <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-600">
          <h3 className="text-sm font-semibold text-yellow-400 mb-1">Debug Info:</h3>
          <p className="text-xs text-gray-300">{debugInfo}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonacoEditor language={language} code={code} setCode={setCode} />
       <div className="grid grid-cols-1 gap-4">
          <OutputPanel output={getOutput(outputDetails)} />
          <AISuggestions
            output={getOutput(outputDetails)}
            code={code}
            language={language}
            onCodeGenerated={setCode}
          />
        </div>
      </div>

      {/* Collaboration Modal */}
      <CollaborationModal
        isOpen={showCollabModal}
        onClose={() => setShowCollabModal(false)}
        code={code}
        onCodeChange={setCode}
        language={language}
        onLanguageChange={setLanguage}
        onRunCode={runCode}
      />
    </main>
  );
}