"use client";

import { useEffect, useRef, useState } from "react";
import type { Criativo, Lead } from "@/lib/types";

interface LeadsResponse {
  leads: Lead[];
  anuncios?: Record<string, Criativo>;
  atualizadoEm: number;
  avisosColunas: string[];
  statusNaoReconhecido: number;
  avisoAtualizacao?: string;
  erro?: string;
}

export interface UseLiveLeadsResult {
  leads: Lead[];
  anuncios: Record<string, Criativo>;
  carregandoInicial: boolean;
  erroInicial: string | null;
  avisoDiscreto: string | null;
  atualizadoEm: number | null;
  avisosColunas: string[];
  statusNaoReconhecido: number;
  pausado: boolean;
  alternarPausado: () => void;
  atualizarAgora: () => void;
}

const INTERVALO_MS = 25_000;

export function useLiveLeads(clienteId: string): UseLiveLeadsResult {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [anuncios, setAnuncios] = useState<Record<string, Criativo>>({});
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [erroInicial, setErroInicial] = useState<string | null>(null);
  const [avisoDiscreto, setAvisoDiscreto] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<number | null>(null);
  const [avisosColunas, setAvisosColunas] = useState<string[]>([]);
  const [statusNaoReconhecido, setStatusNaoReconhecido] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const temDadosRef = useRef(false);

  useEffect(() => {
    let ignorar = false;

    async function carregar() {
      try {
        const res = await fetch(`/api/clientes/${clienteId}/leads`, { cache: "no-store" });
        const data: LeadsResponse = await res.json();
        if (ignorar) return;

        if (!res.ok) {
          if (temDadosRef.current) {
            setAvisoDiscreto(data.erro ?? "Não foi possível atualizar agora.");
          } else {
            setErroInicial(data.erro ?? "Não foi possível carregar os leads.");
          }
          return;
        }

        setLeads(data.leads);
        setAnuncios(data.anuncios ?? {});
        setAtualizadoEm(data.atualizadoEm);
        setAvisosColunas(data.avisosColunas ?? []);
        setStatusNaoReconhecido(data.statusNaoReconhecido ?? 0);
        setAvisoDiscreto(data.avisoAtualizacao ?? null);
        setErroInicial(null);
        temDadosRef.current = true;
      } catch {
        if (ignorar) return;
        if (temDadosRef.current) {
          setAvisoDiscreto("Não foi possível atualizar agora.");
        } else {
          setErroInicial("Não foi possível conectar ao servidor.");
        }
      } finally {
        if (!ignorar) setCarregandoInicial(false);
      }
    }

    carregar();
    const id = pausado ? null : setInterval(carregar, INTERVALO_MS);
    return () => {
      ignorar = true;
      if (id) clearInterval(id);
    };
  }, [clienteId, pausado, refreshKey]);

  return {
    leads,
    anuncios,
    carregandoInicial,
    erroInicial,
    avisoDiscreto,
    atualizadoEm,
    avisosColunas,
    statusNaoReconhecido,
    pausado,
    alternarPausado: () => setPausado((v) => !v),
    atualizarAgora: () => setRefreshKey((k) => k + 1),
  };
}
