import { EditCampaign } from './EditCampaign';

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string; campaignId: string }>;
}) {
  const { id, campaignId } = await params;
  return <EditCampaign productId={id} campaignId={campaignId} />;
}
