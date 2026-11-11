'use client';

import { useFormStatus } from 'react-dom';

/** Submit button that shows a spinner + pending label while its form's server action runs. */
export default function SubmitButton({ children, pendingText, className = 'btn-primary', ...props }) {
  const { pending } = useFormStatus();
  return (
    <button {...props} className={className} disabled={pending || props.disabled} aria-busy={pending}>
      {pending && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {pending ? pendingText || children : children}
    </button>
  );
}
