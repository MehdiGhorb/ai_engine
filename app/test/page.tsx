'use client';

import { useState } from 'react';

export default function TestPage() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const testAPI = async () => {
    setTesting(true);
    setResult(null);
    setError('');

    try {
      const response = await fetch('/api/test');
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🧪 API Test Page
          </h1>
          <p className="text-purple-200">
            Test if your Runware API connection is working
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          <button
            onClick={testAPI}
            disabled={testing}
            className="w-full py-4 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all transform hover:scale-105 mb-6"
          >
            {testing ? 'Testing...' : 'Test API Connection'}
          </button>

          {testing && (
            <div className="text-center text-purple-200 mb-6">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
              <p className="mt-2">Testing API connection...</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
                <h2 className="text-green-300 font-bold text-xl mb-2">
                  ✅ Success!
                </h2>
                <p className="text-green-200">API connection is working</p>
              </div>

              <div className="bg-slate-800 rounded-xl p-4 overflow-auto max-h-96">
                <h3 className="text-white font-semibold mb-2">Response:</h3>
                <pre className="text-sm text-purple-200 whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>

              {result.response?.[0]?.imageURL && (
                <div className="bg-slate-800 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-4">Generated Image:</h3>
                  <img
                    src={result.response[0].imageURL}
                    alt="Test generation"
                    className="w-full rounded-lg"
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                <h2 className="text-red-300 font-bold text-xl mb-2">
                  ❌ Error
                </h2>
                <p className="text-red-200">API test failed</p>
              </div>

              <div className="bg-slate-800 rounded-xl p-4 overflow-auto max-h-96">
                <h3 className="text-white font-semibold mb-2">Error Details:</h3>
                <pre className="text-sm text-red-200 whitespace-pre-wrap">
                  {error}
                </pre>
              </div>

              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4">
                <h3 className="text-yellow-300 font-bold mb-2">
                  💡 Troubleshooting Tips:
                </h3>
                <ul className="text-yellow-200 space-y-2 text-sm list-disc list-inside">
                  <li>Check if your API key is correct in `.env.local`</li>
                  <li>Verify you have credits in your Runware account</li>
                  <li>Make sure you restarted the dev server after adding the API key</li>
                  <li>Check Runware's service status</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-purple-300 hover:text-purple-100 underline"
          >
            ← Back to Main App
          </a>
        </div>
      </div>
    </main>
  );
}
