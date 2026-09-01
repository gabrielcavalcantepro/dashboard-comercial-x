import { listarClientes } from "@/lib/db";
import { ClientSelectionView } from "@/components/client-selection/ClientSelectionView";

// Sem isso, o Next tentaria pré-renderizar esta página estaticamente no
// build, congelando a lista de clientes no momento do build — um cliente
// cadastrado depois só apareceria após o próximo deploy.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const clientes = await listarClientes();
  return <ClientSelectionView clientes={clientes} />;
}
