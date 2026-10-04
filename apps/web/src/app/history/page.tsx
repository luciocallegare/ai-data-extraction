'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { api, type Extraction } from '@/lib/api';

export default function HistoryPage() {
  const [extractions, setExtractions] = useState<Extraction[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listExtractions()
      .then((res) => setExtractions(res.extractions))
      .catch((err) => setError((err as Error).message));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-gray-900">History</h1>

        {error && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {extractions === null && !error && (
          <div className="mt-8 flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            Loading...
          </div>
        )}

        {extractions !== null && extractions.length === 0 && (
          <div className="mt-8 rounded border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No extractions yet.</p>
            <Link href="/new" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
              Create your first extraction
            </Link>
          </div>
        )}

        {extractions !== null && extractions.length > 0 && (
          <ul className="mt-4 space-y-2">
            {extractions.map((ex) => (
              <li key={ex._id}>
                <Link
                  href={`/extractions/${ex._id}`}
                  className="block rounded border border-gray-200 bg-white px-4 py-3 hover:border-blue-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {ex.status === 'success' && ex.data ? `${Object.keys(ex.data).length} fields` : ex.status === 'success' ? '0 fields' : 'Failed'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(ex.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span>{ex.provider}</span>
                    <span>·</span>
                    <span>{ex.model}</span>
                    {ex.parentExtractionId && (
                      <>
                        <span>·</span>
                        <span className="text-blue-600">refinement</span>
                      </>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
