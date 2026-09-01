"use client";

import { useEffect, useState } from "react";
import type { AdsResponse } from "@/lib/meta-types";
import type { Periodo } from "@/lib/metrics";

interface UseAdsDataResult {
  dados: AdsResponse | null;
  carregando: boolean;
  erro: string | null;
  avisoDiscreto: string | null;
}

export function useAdsData(clienteId: string, periodo: Periodo, ativo: boolean): UseAdsDataResult {
  const [dados, setDados] = useState<AdsResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [avisoDiscreto, setAvisoDiscreto] = useState<string | null>(null);

  useEffect(() => {
    if (!ativo) return;
    let cancelado = false;

    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const params = new URLSearchParams({ inicio: periodo.inicio, fim: periodo.fim });
        const res = await fetch(`/api/clientes/${clienteId}/ads?${params}`, { cache: "no-store" });
        const data = await res.json();
        if (cancelado) return;
        if (!res.ok) {
          setErro(data.erro ?? "Não foi possível carregar as métricas de tráfego pago.");
          return;
        }
        setDados(data);
        setAvisoDiscreto(data.avisoAtualizacao ?? null);
      } catch {
        if (!cancelado) setErro("Não foi possível conectar ao servidor.");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [clienteId, periodo.inicio, periodo.fim, ativo]);

  return { dados, carregando, erro, avisoDiscreto };
}
