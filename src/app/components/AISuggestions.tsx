'use client';
import { Copy, Sparkles, Lightbulb, Code, Zap, AlertCircle } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

interface AISuggestionsProps {
  output?: any;
  code?: string;
  language?: string;
}

export default function AISuggestions({ output, code, language }: AISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState('');

  // Function to call your API route instead of directly calling OpenAI
  const getAISuggestions = async () => {
    if (!code?.trim()) {
      setError("Please write some code first!");
      return;
    }

    setLoading(true);
    setError("");
    setSuggestions([]);
    

    try {
      const response = await fetch('/api/ai-suggestions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ code, language, customPrompt }),
});

    console.log("response",response)
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      setError(error instanceof Error ? error.message : "Failed to get AI suggestions");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };


  const handlecopy=() => {
    copyToClipboard(suggestions.join('\n'))
    toast.success('copied to clipboard!')
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
      <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <div className="flex items-center space-x-2 ml-4">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h2 className="font-bold text-lg">AI Assistant</h2>
          </div>
        </div>
        <button 
          onClick={handlecopy}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="Copy all suggestions"
        >
          <Copy className="w-4 h-4 text-gray-400" />
        </button> 
      </div>
      <div className="p-4">
      <input
        className="w-full p-2 border rounded mb-4 text-sm"
        placeholder="Optional: Custom prompt (e.g. Suggest improvements for frontend performance)"
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
      />
      </div>

      <div className="p-4">
        {/* Ask AI Button */}
        <button
          onClick={getAISuggestions}
          disabled={loading}
          className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-200 mb-4 ${
            loading 
              ? "bg-gray-600 cursor-not-allowed" 
              : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transform hover:scale-105"
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Submit</span>
              <Sparkles className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Suggestions Display */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center space-x-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <span>AI Suggestions:</span>
            </h3>
            {suggestions.map((suggestion, index) => (
              <div 
                key={index}
                className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 hover:bg-purple-500/15 transition-colors"
              >
                <p className="text-sm text-purple-100">{suggestion}</p>
                <button 
                  onClick={handlecopy}
                  className="mt-2 text-xs text-purple-300 hover:text-purple-200 flex items-center space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
            ))}
          </div>
        )}


        {/* Quick Actions */}
        {/* <div className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold text-gray-300">Quick Actions:</h3>
          <div className="grid grid-cols-1 gap-2">
            <button className="text-left p-2 hover:bg-gray-700/30 rounded-lg text-sm transition-colors flex items-center space-x-2">
              <span>🔍</span>
              <span>Explain Code</span>
            </button>
            <button className="text-left p-2 hover:bg-gray-700/30 rounded-lg text-sm transition-colors flex items-center space-x-2">
              <span>🐛</span>
              <span>Find Bugs</span>
            </button>
            <button className="text-left p-2 hover:bg-gray-700/30 rounded-lg text-sm transition-colors flex items-center space-x-2">
              <span>⚡</span>
              <span>Optimize Code</span>
            </button>
            <button className="text-left p-2 hover:bg-gray-700/30 rounded-lg text-sm transition-colors flex items-center space-x-2">
              <span>📝</span>
              <span>Add Comments</span>
            </button>
          </div>
        </div> */}
      </div>
    </div>   
  );
}