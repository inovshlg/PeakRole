/** Shown instead of the site when the database is missing or unreachable. */
export default function SetupNeeded({ status }) {
  const missing = status.reason === 'missing';
  const hints = {
    ENOTFOUND: 'The database host name could not be found. Check that DATABASE_URL is copied correctly.',
    ECONNREFUSED: 'The database refused the connection. Check the host and port in DATABASE_URL.',
    ETIMEDOUT: 'The database did not answer in time. Check that the Neon database is active.',
    '28P01': 'The database rejected the username or password in DATABASE_URL.',
    '3D000': 'The database name in DATABASE_URL does not exist.',
  };
  return (
    <div className="container-x max-w-2xl py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-clay-600">Setup needed</p>
      <h1 className="mt-2 text-4xl">{missing ? 'Connect a database to finish setup' : 'The site can’t reach its database'}</h1>
      {missing ? (
        <ol className="mt-6 list-decimal space-y-3 pl-5 text-ink/80">
          <li>In your Vercel project, open <b>Storage</b>, then <b>Create Database</b>, then <b>Neon (Serverless Postgres)</b>. Create it in the region closest to your Vercel functions (default: Washington, D.C. / <code>us-east-1</code>).</li>
          <li>Click <b>Connect Project</b> and pick this project. This adds <code>DATABASE_URL</code> automatically.</li>
          <li>Open <b>Deployments</b>, then <b>⋯</b> on the latest deployment, then <b>Redeploy</b>. Environment variables only take effect after a redeploy.</li>
        </ol>
      ) : (
        <div className="mt-6 space-y-3 text-ink/80">
          <p>Error code: <code className="rounded bg-sand-100 px-1.5 py-0.5">{status.code}</code></p>
          <p>{hints[status.code] || 'Check DATABASE_URL in Settings → Environment Variables, then redeploy. The full error is in the Vercel project’s Logs tab.'}</p>
        </div>
      )}
    </div>
  );
}
