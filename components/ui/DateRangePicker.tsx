"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import type { Periodo } from "@/lib/metrics";
import { addDaysISO, formatDateBR, toISODate } from "@/lib/format";

export interface DateRangePreset {
  rotulo: string;
  periodo: Periodo | null;
}

interface DateRangePickerProps {
  value: Periodo | null;
  onChange: (periodo: Periodo | null) => void;
  presets?: DateRangePreset[];
  rotuloSemSelecao?: string;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS_SEMANA = ["S", "T", "Q", "Q", "S", "S", "D"];
const GAP = 6;
const MARGEM = 12;

function hojeISO(): string {
  return toISODate(new Date());
}

function primeiroDiaDoMes(ano: number, mes: number): Date {
  return new Date(Date.UTC(ano, mes, 1));
}

function gerarDiasDoMes(ano: number, mes: number): (string | null)[] {
  const primeiro = primeiroDiaDoMes(ano, mes);
  const offset = (primeiro.getUTCDay() + 6) % 7; // segunda = 0
  const totalDias = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const dias: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= totalDias; d++) {
    dias.push(toISODate(new Date(Date.UTC(ano, mes, d))));
  }
  return dias;
}

export function presetsPadrao(): DateRangePreset[] {
  const hoje = hojeISO();
  return [
    { rotulo: "Todo o período", periodo: null },
    { rotulo: "Hoje", periodo: { inicio: hoje, fim: hoje } },
    { rotulo: "Últimos 7 dias", periodo: { inicio: addDaysISO(hoje, -6), fim: hoje } },
    { rotulo: "Últimos 30 dias", periodo: { inicio: addDaysISO(hoje, -29), fim: hoje } },
    {
      rotulo: "Este mês",
      periodo: { inicio: `${hoje.slice(0, 7)}-01`, fim: hoje },
    },
  ];
}

export function DateRangePicker({
  value,
  onChange,
  presets = presetsPadrao(),
  rotuloSemSelecao = "Todo o período",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [modoCustom, setModoCustom] = useState(false);
  const [inicioTemp, setInicioTemp] = useState<string | null>(null);
  const [fimTemp, setFimTemp] = useState<string | null>(null);
  const hoje = new Date();
  const [viewAno, setViewAno] = useState(hoje.getUTCFullYear());
  const [viewMes, setViewMes] = useState(hoje.getUTCMonth());
  const wrapperRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (wrapperRef.current?.contains(alvo)) return;
      if (panelRef.current?.contains(alvo)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Painel é portado pro body e posicionado contra a viewport (não fica
  // preso dentro do modal) — do contrário, um ancestral com overflow
  // (como o Modal, que precisa de overflow-y para o próprio conteúdo)
  // corta ou faz o painel rolar junto, em vez de flutuar por cima.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setCoords({ left: rect.left, top: rect.bottom + GAP });
  }, [open]);

  // Depois que o painel real existe, mede o tamanho dele (muda quando
  // entra em modo "Personalizado") e garante que nunca vaze da tela.
  useLayoutEffect(() => {
    if (!open || !coords || !panelRef.current || !btnRef.current) return;
    const panel = panelRef.current.getBoundingClientRect();
    const trigger = btnRef.current.getBoundingClientRect();

    let left = Math.min(trigger.left, window.innerWidth - panel.width - MARGEM);
    left = Math.max(left, MARGEM);

    let top = trigger.bottom + GAP;
    if (top + panel.height > window.innerHeight - MARGEM) {
      top = Math.max(trigger.top - panel.height - GAP, MARGEM);
    }

    if (Math.round(left) !== Math.round(coords.left) || Math.round(top) !== Math.round(coords.top)) {
      setCoords({ left, top });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modoCustom, viewMes, viewAno, coords?.left, coords?.top]);

  const rotuloAtual = (() => {
    if (!value) return rotuloSemSelecao;
    const preset = presets.find(
      (p) => p.periodo && p.periodo.inicio === value.inicio && p.periodo.fim === value.fim,
    );
    if (preset) return preset.rotulo;
    return `${formatDateBR(value.inicio)} — ${formatDateBR(value.fim)}`;
  })();

  const dias = gerarDiasDoMes(viewAno, viewMes);

  const clicarDia = (iso: string) => {
    if (!inicioTemp || (inicioTemp && fimTemp)) {
      setInicioTemp(iso);
      setFimTemp(null);
      return;
    }
    if (iso < inicioTemp) {
      setInicioTemp(iso);
      setFimTemp(null);
      return;
    }
    setFimTemp(iso);
    onChange({ inicio: inicioTemp, fim: iso });
    setOpen(false);
    setModoCustom(false);
  };

  const emIntervalo = (iso: string) => {
    if (!inicioTemp) return false;
    const fim = fimTemp ?? inicioTemp;
    return iso >= inicioTemp && iso <= fim;
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={clsx(
          "flex h-10 items-center gap-2.5 rounded-[var(--radius-sm)] border px-3.5 text-[13px] transition-colors duration-150",
          open
            ? "border-[var(--color-accent-border)] bg-[var(--color-surface-raised)]"
            : "border-[var(--color-border-strong)] bg-[var(--color-surface)] hover:border-[var(--color-text-faint)]",
        )}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-[var(--color-text-faint)]">
          <rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
          <path d="M1.5 5.5H12.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4 1V3.2M10 1V3.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span className="text-[var(--color-text)]">{rotuloAtual}</span>
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && coords && (
              <motion.div
                ref={panelRef}
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                style={{ position: "fixed", left: coords.left, top: coords.top }}
                className={clsx(
                  "z-[100] flex overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]",
                  modoCustom ? "w-[560px] max-w-[90vw]" : "w-[190px]",
                )}
              >
                <div className="w-[180px] shrink-0 border-r border-[var(--color-border)] p-2">
                  {presets.map((p) => (
                    <button
                      key={p.rotulo}
                      type="button"
                      onClick={() => {
                        onChange(p.periodo);
                        setModoCustom(false);
                        setOpen(false);
                      }}
                      className={clsx(
                        "block w-full rounded-[var(--radius-sm)] px-3 py-2 text-left text-[13px] transition-colors",
                        !modoCustom &&
                          ((value === null && p.periodo === null) ||
                            (value && p.periodo && value.inicio === p.periodo.inicio && value.fim === p.periodo.fim))
                          ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                          : "text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text)]",
                      )}
                    >
                      {p.rotulo}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setModoCustom(true)}
                    className={clsx(
                      "block w-full rounded-[var(--radius-sm)] px-3 py-2 text-left text-[13px] transition-colors",
                      modoCustom
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                        : "text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text)]",
                    )}
                  >
                    Personalizado
                  </button>
                </div>

                {modoCustom && (
                  <div className="w-[380px] shrink-0 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(Date.UTC(viewAno, viewMes - 1, 1));
                          setViewAno(d.getUTCFullYear());
                          setViewMes(d.getUTCMonth());
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-white/5"
                      >
                        ‹
                      </button>
                      <span className="text-[13px] font-medium text-[var(--color-text)]">
                        {MESES[viewMes]} {viewAno}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(Date.UTC(viewAno, viewMes + 1, 1));
                          setViewAno(d.getUTCFullYear());
                          setViewMes(d.getUTCMonth());
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-white/5"
                      >
                        ›
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[var(--color-text-faint)]">
                      {DIAS_SEMANA.map((d, i) => (
                        <div key={i} className="py-1">{d}</div>
                      ))}
                      {dias.map((iso, i) =>
                        iso ? (
                          <button
                            key={iso}
                            type="button"
                            onClick={() => clicarDia(iso)}
                            className={clsx(
                              "aspect-square rounded-[7px] text-[12.5px] transition-colors",
                              emIntervalo(iso)
                                ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                                : "text-[var(--color-text-muted)] hover:bg-white/8 hover:text-[var(--color-text)]",
                            )}
                          >
                            {Number(iso.slice(8, 10))}
                          </button>
                        ) : (
                          <div key={`empty-${i}`} />
                        ),
                      )}
                    </div>
                    <p className="mt-3 text-[11.5px] text-[var(--color-text-faint)]">
                      {inicioTemp
                        ? `De ${formatDateBR(inicioTemp)}${fimTemp ? ` até ${formatDateBR(fimTemp)}` : " — selecione o fim"}`
                        : "Selecione a data inicial"}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
