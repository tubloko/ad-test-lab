import { AdsetDetail } from './AdsetDetail';

export default async function AdsetPage({
  params,
}: {
  params: Promise<{ id: string; adsetId: string }>;
}) {
  const { id, adsetId } = await params;
  return <AdsetDetail productId={id} adsetId={adsetId} />;
}
