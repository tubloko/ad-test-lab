import { EditAdset } from './EditAdset';

export default async function EditAdsetPage({
  params,
}: {
  params: Promise<{ id: string; adsetId: string }>;
}) {
  const { id, adsetId } = await params;
  return <EditAdset productId={id} adsetId={adsetId} />;
}
