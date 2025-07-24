export default function OutputPanel({ output }: any) {
  return (
    <div className="bg-[#161b22] rounded p-4 space-y-4 h-[60vh] overflow-auto">
      <div>
        <h2 className="font-bold text-lg">Output</h2>
        <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>
      </div>
      <div>
        <h2 className="font-bold text-lg">🤖 AI Suggestions</h2>
        <ul className="list-disc ml-5">
          <li>print_cube(n)</li>
          <li>print_square(x) + 10</li>
        </ul>
        <input
          type="text"
          placeholder="Ask AI..."
          className="w-full mt-2 px-2 py-1 bg-[#0d1117] border border-gray-600 rounded"
        />
      </div>
    </div>
  );
}