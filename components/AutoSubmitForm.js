'use client';

/** A GET form that submits itself whenever a filter changes (the button stays as a no-JS fallback). */
export default function AutoSubmitForm({ children, ...props }) {
  return (
    <form {...props} onChange={(e) => { if (e.target.type !== 'text' && e.target.type !== 'search') e.currentTarget.requestSubmit(); }}>
      {children}
    </form>
  );
}
