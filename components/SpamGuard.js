/** Hidden honeypot + render timestamp for lib/spam.mjs. Place inside a <form>. */
export default function SpamGuard() {
  return (
    <>
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>Website <input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <input type="hidden" name="form_ts" value={Date.now()} />
    </>
  );
}
