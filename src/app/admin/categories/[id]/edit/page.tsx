import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import Category from "@/models/Category";
import CategoryForm from "../../CategoryForm";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectDB();
  const category = await Category.findById(id).lean();
  if (!category) notFound();

  const serialized = {
    _id: String(category._id),
    name: category.name,
    slug: category.slug,
    position: category.position,
    active: category.active,
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Edit Category</h1>
      <CategoryForm initialData={serialized} />
    </div>
  );
}
