"use client";

import type { Filtros, OpcoesFiltro, Periodo } from "@/lib/metrics";
import type { StatusLead } from "@/lib/types";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Button } from "@/components/ui/Button";

interface FiltersBarProps {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
  opcoes: OpcoesFiltro;
  onAbrirRelatorio: () => void;
}

const STATUS_OPCOES: { value: StatusLead; label: string; color: string }[] = [
  { value: "Agendado", label: "Agendado", color: "var(--color-agendado)" },
  { value: "Avaliando", label: "Avaliando", color: "var(--color-avaliando)" },
  { value: "Desistiu", label: "Desistiu", color: "var(--color-desistiu)" },
];

function haFiltrosAtivos(f: Filtros): boolean {
  return Boolean(
    f.periodo || f.vendedores.length || f.fontes.length || f.procedimentos.length || f.statuses.length,
  );
}

export function FiltersBar({ filtros, onChange, opcoes, onAbrirRelatorio }: FiltersBarProps) {
  const setPeriodo = (periodo: Periodo | null) => onChange({ ...filtros, periodo });

  return (
    <div className="mb-8 flex flex-wrap items-center gap-2.5">
      <DateRangePicker value={filtros.periodo} onChange={setPeriodo} />
      <MultiSelect
        label="Vendedor"
        options={opcoes.vendedores.map((v) => ({ value: v, label: v }))}
        selected={filtros.vendedores}
        onChange={(vendedores) => onChange({ ...filtros, vendedores })}
        className="w-[150px]"
      />
      <MultiSelect
        label="Fonte"
        options={opcoes.fontes.map((v) => ({ value: v, label: v }))}
        selected={filtros.fontes}
        onChange={(fontes) => onChange({ ...filtros, fontes })}
        className="w-[150px]"
      />
      <MultiSelect
        label="Procedimento"
        options={opcoes.procedimentos.map((v) => ({ value: v, label: v }))}
        selected={filtros.procedimentos}
        onChange={(procedimentos) => onChange({ ...filtros, procedimentos })}
        className="w-[160px]"
      />
      <MultiSelect
        label="Status"
        options={STATUS_OPCOES}
        selected={filtros.statuses}
        onChange={(statuses) => onChange({ ...filtros, statuses: statuses as StatusLead[] })}
        className="w-[150px]"
      />
      <Button variant="secondary" size="sm" onClick={onAbrirRelatorio}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M3 1.5H8.5L11 4V12.5H3V1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M8.5 1.5V4H11" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M5 8.5L7 10.5L9.5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Gerar relatório
      </Button>
      {haFiltrosAtivos(filtros) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({ periodo: null, vendedores: [], fontes: [], procedimentos: [], statuses: [] })
          }
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
