'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { api, type StreamChunk } from '@/lib/api';

type Status = 'idle' | 'streaming' | 'error';

export default function NewExtractionPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [streamedContent, setStreamedContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || status === 'streaming') return;
    setStatus('streaming');
    setError('');
    setStreamedContent('');

    try {
      await api.createExtractionStream(text.trim(), (chunk: StreamChunk) => {
        if (!chunk || typeof chunk !== 'object') return;
        if (chunk.error) {
          setError(chunk.error);
          setStatus('error');
          return;
        }
        if (chunk.done) {
          try {
            const content = chunk.content;
            if (!content) {
              setError('Empty response from server');
              setStatus('error');
              return;
            }
            const result = JSON.parse(content);
            router.push(`/extractions/${result.id}`);
          } catch {
            setError('Invalid response from server');
            setStatus('error');
          }
        } else {
          const content = chunk.content;
          if (content) {
            setStreamedContent(content);
          }
        }
      }, () => {
        // onDone - handled in chunk.done
      });
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-gray-900">New extraction</h1>
        <p className="mt-1 text-sm text-gray-600">
          Paste any text — a support email, job posting, invoice description — and the AI will extract
          structured data.
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here..."
            rows={10}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            disabled={status === 'streaming'}
          />

          {status === 'streaming' && streamedContent && (
            <div className="mt-3 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-700 max-h-40 overflow-auto">
              Streaming...<br />
              {streamedContent}
            </div>
          )}

          {status === 'streaming' && !streamedContent && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              Starting extraction...
            </div>
          )}

          {status === 'error' && (
            <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!text.trim() || status === 'streaming'}
            className="mt-4 rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {status === 'streaming' ? 'Streaming...' : 'Extract'}
          </button>
        </form>
      </main>
    </div>
  );
}
