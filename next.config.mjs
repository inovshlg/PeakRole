/** @type {import('next').NextConfig} */
const nextConfig = {
  // node:sqlite is a Node built-in; keep it out of the bundle.
  webpack: (config, { isServer }) => {
    if (isServer) config.externals.push({ 'node:sqlite': 'commonjs node:sqlite' });
    return config;
  },
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
};
export default nextConfig;
