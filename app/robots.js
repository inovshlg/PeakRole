export default function robots() {
  const site = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/messages', '/profile', '/dashboard', '/cv/', '/employers/'] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
