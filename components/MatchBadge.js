export function matchTone(score) {
  if (score >= 85) return 'bg-brand-700 text-white';
  if (score >= 70) return 'bg-brand-100 text-brand-900';
  if (score >= 50) return 'bg-canvas-200 text-ink';
  return 'bg-canvas-100 text-ink/60';
}

export default function MatchBadge({ score, ai = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${matchTone(score)} ${className}`} title={ai ? 'AI match score' : 'Keyword match score'}>
      {ai ? '' : ''}{score}% match
    </span>
  );
}
