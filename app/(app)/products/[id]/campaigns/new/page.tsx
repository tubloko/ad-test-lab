import { NewCampaign } from './NewCampaign';

export default async function NewCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NewCampaign productId={id} />;
}
