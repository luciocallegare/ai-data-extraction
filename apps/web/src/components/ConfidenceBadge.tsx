interface FieldConfidence {
  status: 'VERIFIED' | 'UNCERTAIN' | 'NOT_FOUND';
  signals: string[];
  score: number; // 0-100
}

export default function ConfidenceBadge({ confidence }: { confidence: FieldConfidence | number }) {
  const score = typeof confidence === 'number' ? confidence : confidence?.score ?? 0;
  const pct = Math.round(score);
  const color =
    score >= 60 ? 'bg-green-100 text-green-800' : score >= 30 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {pct}%
    </span>
  );
}
