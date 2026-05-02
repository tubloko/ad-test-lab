import { NewAdset } from './NewAdset';

export default async function NewAdsetPage({
  params,
}: {
  params: Promise<{ id: string; campaignId: string }>;
}) {
  const { id, campaignId } = await params;
  return <NewAdset productId={id} campaignId={campaignId} />;
}
