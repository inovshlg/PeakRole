/** @type {import('next').NextConfig} */
const nextConfig = {
  // Database drivers and the PDF renderer load native/WASM/font files at runtime; don't bundle them.
  serverExternalPackages: ['pg', '@electric-sql/pglite', 'mammoth', '@react-pdf/renderer'],
  // Ship the bundled CV fonts with the PDF route on Vercel.
  outputFileTracingIncludes: { '/api/cvs/[id]/pdf': ['./assets/fonts/**'] },
  experimental: { serverActions: { bodySizeLimit: '4.5mb' } },
};
export default nextConfig;
