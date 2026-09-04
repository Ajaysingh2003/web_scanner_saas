import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductSlugRedirectPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/scans/${slug}`);
}
