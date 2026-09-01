"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ClientePublico } from "@/lib/types";
import { ClientFormModal } from "@/components/client-selection/ClientFormModal";
import { LiveIndicator } from "./LiveIndicator";

interface DashboardHeaderProps {
  cliente: ClientePublico;
  atualizadoEm: number | null;
  pausado: boolean;
  alternarPausado: () => void;
  avisoDiscreto: string | null;
}

export function DashboardHeader({
  cliente,
  atualizadoEm,
  pausado,
  alternarPausado,
  avisoDiscreto,
}: DashboardHeaderProps) {
  const [editando, setEditando] = useState(false);

  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          aria-label="Voltar para a lista de clientes"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-strong)] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent-border)] hover:text-[var(--color-accent)]"
        >
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
            <path d="M8 1L1.5 7.5L8 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[24px] font-semibold text-[var(--color-text)] sm:text-[28px]">
              {cliente.nome}
            </h1>
            <span className="rounded-full border border-[var(--color-border-strong)] px-2.5 py-0.5 text-[11px] text-[var(--color-text-muted)]">
              {cliente.segmento}
            </span>
            <button
              type="button"
              aria-label="Editar cliente"
              onClick={() => setEditando(true)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--color-text-faint)] transition-colors hover:bg-white/5 hover:text-[var(--color-text)]"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path
                  d="M9.5 1.5L12.5 4.5L4.5 12.5H1.5V9.5L9.5 1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div className="mt-1.5">
            <LiveIndicator
              atualizadoEm={atualizadoEm}
              pausado={pausado}
              alternarPausado={alternarPausado}
              avisoDiscreto={avisoDiscreto}
            />
          </div>
        </div>
      </div>
      <Image src="/logo.png" alt="" width={160} height={40} className="h-auto w-28 opacity-80 sm:w-32" />
      <ClientFormModal open={editando} onClose={() => setEditando(false)} cliente={cliente} />
    </header>
  );
}
