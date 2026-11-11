'use client';

export default function Error({ error, reset }) {
  return (
    <div className="container-x max-w-xl py-24 text-center">
      <h1 className="text-4xl">Something went wrong</h1>
      <p className="mt-3 text-ink/60">Please try again. If it keeps happening, the details are in the server logs{error?.digest ? ` (reference ${error.digest})` : ''}.</p>
      <button onClick={() => reset()} className="btn-primary mt-8">Try again</button>
    </div>
  );
}
