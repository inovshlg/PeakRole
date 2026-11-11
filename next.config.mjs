/** @type {import('next').NextConfig} */
const nextConfig = {
  // Database drivers load native/WASM files at runtime; don't bundle them.
  serverExternalPackages: ['pg', '@electric-sql/pglite', 'mammoth'],
  experimental: { serverActions: { bodySizeLimit: '4.5mb' } },
};
export default nextConfig;
