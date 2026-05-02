import { NewAdset } from './NewAdset';

export default async function NewAdsetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NewAdset productId={id} />;
}
