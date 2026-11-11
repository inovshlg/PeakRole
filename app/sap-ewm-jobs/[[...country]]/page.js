import SeoJobList, { seoMetadata } from '@/components/SeoJobList';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { country } = await params;
  return seoMetadata('EWM', country?.[0]);
}

export default async function Page({ params }) {
  const { country } = await params;
  return <SeoJobList module="EWM" countrySlug={country?.[0]} />;
}
