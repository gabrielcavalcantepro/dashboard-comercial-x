"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { DateRangePicker, type DateRangePreset } from "@/components/ui/DateRangePicker";
import { Button } from "@/components/ui/Button";
import type { Periodo } from "@/lib/metrics";
import { addDaysISO, toISODate } from "@/lib/format";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  vendedores: string[];
  onConfirmar: (params: { vendedor: string; periodo: Periodo }) => void;
  gerando: boolean;
}

const TODOS_VENDEDORES = "__todos__";

function periodoPadrao(): Periodo {
  const hoje = toISODate(new Date());
  return { inicio: addDaysISO(hoje, -29), fim: hoje };
}

function presetsRelatorio(): DateRangePreset[] {
  const hoje = toISODate(new Date());
  return [
    { rotulo: "Ontem", periodo: { inicio: addDaysISO(hoje, -1), fim: addDaysISO(hoje, -1) } },
    { rotulo: "Últimos 7 dias", periodo: { inicio: addDaysISO(hoje, -6), fim: hoje } },
    { rotulo: "Últimos 30 dias", periodo: { inicio: addDaysISO(hoje, -29), fim: hoje } },
    { rotulo: "Este mês", periodo: { inicio: `${hoje.slice(0, 7)}-01`, fim: hoje } },
    { rotulo: "Este ano", periodo: { inicio: `${hoje.slice(0, 4)}-01-01`, fim: hoje } },
  ];
}

export function ReportModal({ open, onClose, vendedores, onConfirmar, gerando }: ReportModalProps) {
  const [vendedor, setVendedor] = useState(TODOS_VENDEDORES);
  const [periodo, setPeriodo] = useState<Periodo>(periodoPadrao());

  const opcoesVendedor = [
    { value: TODOS_VENDEDORES, label: "Todos os vendedores" },
    ...vendedores.map((v) => ({ value: v, label: v })),
  ];

  const fechar = () => {
    if (gerando) return;
    onClose();
  };

  const confirmar = () => {
    onConfirmar({
      vendedor: vendedor === TODOS_VENDEDORES ? "" : vendedor,
      periodo,
    });
  };

  return (
    <Modal
      open={open}
      onClose={fechar}
      title="Gerar relatório"
      description="Exporte um resumo em PDF com as principais métricas do período escolhido."
      width={440}
    >
      <div className="flex flex-col gap-5">
        <Select
          label="Vendedor"
          options={opcoesVendedor}
          value={vendedor}
          onChange={setVendedor}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-[var(--color-text-muted)]">Período</span>
          <DateRangePicker
            value={periodo}
            onChange={(p) => p && setPeriodo(p)}
            presets={presetsRelatorio()}
          />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={fechar} disabled={gerando}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={confirmar} disabled={gerando}>
            {gerando ? "Gerando PDF…" : "Gerar relatório"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
