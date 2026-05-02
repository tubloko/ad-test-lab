import { EditAdset } from './EditAdset';

export default async function EditAdsetPage({
  params,
}: {
  params: Promise<{ id: string; campaignId: string; adsetId: string }>;
}) {
  const { id, campaignId, adsetId } = await params;
  return <EditAdset productId={id} campaignId={campaignId} adsetId={adsetId} />;
}
