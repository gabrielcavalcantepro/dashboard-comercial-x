import { notFound } from "next/navigation";
import { buscarCliente } from "@/lib/db";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function ClienteDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await buscarCliente(id);
  if (!cliente) notFound();

  return <DashboardClient cliente={cliente} />;
}
