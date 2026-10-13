"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { ClientePublico } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ClientRow } from "./ClientRow";
import { ClientFormModal } from "./ClientFormModal";

interface ClientSelectionViewProps {
  clientes: ClientePublico[];
}

export function ClientSelectionView({ clientes }: ClientSelectionViewProps) {
  const [modalAberto, setModalAberto] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-1 flex-col px-6 py-14 sm:py-20">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-14 flex flex-col gap-10"
      >
        <Image src="/logo.png" alt="" width={220} height={55} priority className="h-auto w-44 opacity-95" />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-[32px] font-semibold text-[var(--color-text)] sm:text-[40px]">
              Seus clientes
            </h1>
            <p className="mt-2 max-w-[440px] text-[15px] text-[var(--color-text-muted)]">
              Escolha um cliente para acompanhar o funil de leads em tempo real.
            </p>
          </div>
          <Button variant="primary" onClick={() => setModalAberto(true)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Adicionar cliente
          </Button>
        </div>
      </motion.header>

      {clientes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex flex-1 flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] px-8 py-24 text-center"
        >
          <p className="text-[17px] font-medium text-[var(--color-text)]">
            Nenhum cliente cadastrado ainda
          </p>
          <p className="mt-2 max-w-[340px] text-[14px] text-[var(--color-text-muted)]">
            Adicione o primeiro cliente conectando o funil dele no PipeFácil.
          </p>
          <Button variant="primary" className="mt-6" onClick={() => setModalAberto(true)}>
            Adicionar cliente
          </Button>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          {clientes.map((cliente, i) => (
            <ClientRow key={cliente.id} cliente={cliente} index={i} />
          ))}
        </div>
      )}

      <ClientFormModal open={modalAberto} onClose={() => setModalAberto(false)} />
    </div>
  );
}
