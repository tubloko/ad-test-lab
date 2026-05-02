import { CampaignDetail } from './CampaignDetail';

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string; campaignId: string }>;
}) {
  const { id, campaignId } = await params;
  return <CampaignDetail productId={id} campaignId={campaignId} />;
}
