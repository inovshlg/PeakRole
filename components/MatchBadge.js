export function matchTone(score) {
  if (score >= 85) return 'bg-moss-700 text-white';
  if (score >= 70) return 'bg-moss-100 text-moss-900';
  if (score >= 50) return 'bg-sand-200 text-ink';
  return 'bg-sand-100 text-ink/60';
}

export default function MatchBadge({ score, ai = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${matchTone(score)} ${className}`} title={ai ? 'AI match score' : 'Keyword match score'}>
      {ai ? '✦ ' : ''}{score}% match
    </span>
  );
}
