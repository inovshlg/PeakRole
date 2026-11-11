export default function Flash({ error, ok }) {
  if (error) return <p role="alert" className="alert-error">{error}</p>;
  if (ok) return <p role="status" className="alert-ok">{ok}</p>;
  return null;
}
