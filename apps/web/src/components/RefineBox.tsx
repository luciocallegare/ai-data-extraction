'use client';

import { useState } from 'react';

interface RefineBoxProps {
  onRefine: (question: string) => Promise<void>;
  disabled?: boolean;
}

export default function RefineBox({ onRefine, disabled }: RefineBoxProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    try {
      await onRefine(question.trim());
      setQuestion('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <label htmlFor="refine" className="block text-sm font-medium text-gray-700">
        Refine / Re-ask
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="refine"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a follow-up question..."
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          disabled={disabled || loading}
        />
        <button
          type="submit"
          disabled={disabled || loading || !question.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </form>
  );
}
