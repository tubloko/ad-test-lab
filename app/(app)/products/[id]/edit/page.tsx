import { EditProduct } from './EditProduct';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditProduct productId={id} />;
}
