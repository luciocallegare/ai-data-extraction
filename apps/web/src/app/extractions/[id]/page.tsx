'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import RefineBox from '@/components/RefineBox';
import { api, type Extraction } from '@/lib/api';

export default function ExtractionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [refining, setRefining] = useState(false);

  const load = useCallback(() => {
    api
      .getExtraction(params.id)
      .then(setExtraction)
      .catch((err) => setError((err as Error).message));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefine = async (question: string) => {
    setRefining(true);
    setError('');
    try {
      const result = await api.refineExtraction(params.id, question);
      router.push(`/extractions/${result.id}`);
    } catch (err) {
      setError((err as Error).message);
      setRefining(false);
    }
  };

  const handleCopy = async () => {
    if (!extraction || !extraction.data) return;
    await navigator.clipboard.writeText(JSON.stringify(extraction.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this extraction?')) return;
    await api.deleteExtraction(params.id);
    router.push('/history');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        </main>
      </div>
    );
  }

  if (!extraction) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            Loading...
          </div>
        </main>
      </div>
    );
  }

  // Handle failed extractions where result doesn't have the expected structure
  if (!extraction.data || typeof extraction.data !== 'object') {
    return (
      <div className="min-h-screen bg-gray-50">
        {extraction.toString()}
        <Nav />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Extraction failed or has no data.
          </div>
        </main>
      </div>
    );
  }

  const entries = Object.entries(extraction.data);

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Result</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
            <button
              onClick={handleDelete}
              className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          AI output may be incorrect. Verify important fields before relying on them.
        </div>

        {extraction.warnings.length > 0 && (
          <div className="mt-3 rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            {extraction.warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        )}

        {entries.length === 0 ? (
          <div className="mt-6 rounded border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No fields could be extracted from this text.</p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Field</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Value</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([key, value]) => {
                  const isUnknown = extraction.unknownFields.includes(key);
                  return (
                    <tr key={key} className={isUnknown ? 'bg-red-50' : 'border-b border-gray-100'}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{key}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {value === null ? (
                          <span className="italic text-gray-400">unknown</span>
                        ) : Array.isArray(value) ? (
                          value.join(', ')
                        ) : (
                          String(value)
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <ConfidenceBadge confidence={extraction.confidence[key] ?? 0} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <RefineBox onRefine={handleRefine} disabled={refining} />

        <div className="mt-6 flex items-center gap-4 text-xs text-gray-500">
          <span>{extraction.provider}</span>
          <span>·</span>
          <span>{extraction.model}</span>
          <span>·</span>
          <span>{extraction.tokensIn + extraction.tokensOut} tokens</span>
          <span>·</span>
          <span>{extraction.latencyMs}ms</span>
        </div>
      </main>
    </div>
  );
}
