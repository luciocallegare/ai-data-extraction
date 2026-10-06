'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { api, type Extraction } from '@/lib/api';

function renderExtractionItem(
  ex: Extraction,
  selectedIds: Set<string>,
  deleteMode: boolean,
  toggleSelect: (id: string) => void
) {
  const isSelected = selectedIds.has(ex._id);
  return (
    <li key={ex._id} className={deleteMode ? 'relative' : ''}>
      {deleteMode && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 ml-2">
          <input
            type="checkbox"
            checked={selectedIds.has(ex._id)}
            onChange={() => toggleSelect(ex._id)}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
      )}
      <Link
        href={`/extractions/${ex._id}`}
        className={`block rounded border bg-white px-4 py-3 hover:border-blue-300 ${deleteMode ? 'pr-4' : ''}`}
        style={deleteMode ? { paddingLeft: '3rem' } : {}}
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
  );
}

export default function HistoryPage() {
  const [extractions, setExtractions] = useState<Extraction[] | null>(null);
  const [error, setError] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    api
      .listExtractions()
      .then((res) => setExtractions(res.extractions))
      .catch((err) => setError((err as Error).message));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDelete = async () => {
    for (const id of selectedIds) {
      await api.deleteExtraction(id);
    }
    setExtractions((prev) => prev?.filter((ex) => !selectedIds.has(ex._id)) ?? null);
    setSelectedIds(new Set());
    setDeleteMode(false);
    setShowConfirm(false);
  };

  const handleConfirmDelete = () => {
    setShowConfirm(true);
  };

  const headerActions = !deleteMode ? (
    <button
      onClick={() => setDeleteMode(true)}
      className="text-sm text-gray-600 hover:text-gray-900 font-medium"
    >
      Delete
    </button>
  ) : (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">
        {selectedIds.size} selected
      </span>
      <button
        onClick={() => {
          setDeleteMode(false);
          setSelectedIds(new Set());
        }}
        className="text-sm text-gray-600 hover:text-gray-900 font-medium"
      >
        Cancel
      </button>
      {selectedIds.size > 0 && (
        <button
          onClick={() => setShowConfirm(true)}
          className="text-sm text-red-600 hover:text-red-900 font-medium"
        >
          Delete ({selectedIds.size})
        </button>
      )}
    </div>
  );

  const confirmDialog = showConfirm ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Delete {selectedIds.size} extraction{selectedIds.size > 1 ? 's' : ''}?
        </h2>
        <p className="text-gray-600 mb-6">
          This action cannot be undone. The selected extraction{selectedIds.size > 1 ? 's' : ''} will be permanently deleted.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowConfirm(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const loadingState = extractions === null && !error && (
    <div className="mt-8 flex items-center gap-2 text-sm text-gray-500">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      Loading...
    </div>
  );

  const emptyState = extractions !== null && extractions.length === 0 && (
    <div className="mt-8 rounded border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
      <p className="text-sm text-gray-500">No extractions yet.</p>
      <Link href="/new" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
        Create your first extraction
      </Link>
    </div>
  );

  const extractionList = extractions !== null && extractions.length > 0 ? (
    <ul className="mt-4 space-y-2">
      {extractions.map((ex) => renderExtractionItem(ex, selectedIds, deleteMode, toggleSelect))}
      </ul>
    ) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900">History</h1>
          {headerActions}
        </div>

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
            {extractions.map((ex) => renderExtractionItem(ex, selectedIds, deleteMode, toggleSelect))}
            </ul>
        )}

        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Delete {selectedIds.size} extraction{selectedIds.size > 1 ? 's' : ''}?
              </h2>
              <p className="text-gray-600 mb-6">
                This action cannot be undone. The selected extraction{selectedIds.size > 1 ? 's' : ''} will be permanently deleted.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}