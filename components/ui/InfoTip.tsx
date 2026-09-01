"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

interface InfoTipProps {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
}

const LARGURA = 220;
const GAP = 8;
const MARGEM = 12;

interface Coords {
  left: number;
  top?: number;
  bottom?: number;
  placement: "top" | "bottom";
}

function calcularLeft(rect: DOMRect, align: "left" | "right"): number {
  const left = align === "left" ? rect.left : rect.right - LARGURA;
  return Math.min(Math.max(left, MARGEM), window.innerWidth - LARGURA - MARGEM);
}

export function InfoTip({ children, className, align = "left" }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const visible = open || hovered;

  // Fase 1: ao abrir, posiciona de forma otimista "para cima" (o caso mais
  // comum), ancorado por `bottom` para crescer a partir do botão sem
  // precisar adivinhar a altura do conteúdo.
  useLayoutEffect(() => {
    if (!visible || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setCoords({
      left: calcularLeft(rect, align),
      bottom: window.innerHeight - rect.top + GAP,
      placement: "top",
    });
  }, [visible, align]);

  // Fase 2: mede a altura REAL do tooltip já renderizado (não uma
  // estimativa) e, se ele estourar o topo da janela, troca para "abaixo".
  // Isso é o que faltava: um texto mais longo (como o da desistência
  // pós-qualificação) é mais alto do que qualquer estimativa fixa cobriria.
  useLayoutEffect(() => {
    if (!visible || coords?.placement !== "top" || !tooltipRef.current || !btnRef.current) return;
    const tRect = tooltipRef.current.getBoundingClientRect();
    if (tRect.top < MARGEM) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ left: calcularLeft(rect, align), top: rect.bottom + GAP, placement: "bottom" });
    }
  }, [visible, coords, align]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const fechar = () => {
      setOpen(false);
      setHovered(false);
    };
    window.addEventListener("scroll", fechar, { passive: true, capture: true });
    window.addEventListener("resize", fechar);
    return () => {
      window.removeEventListener("scroll", fechar, { capture: true });
      window.removeEventListener("resize", fechar);
    };
  }, [visible]);

  return (
    <div
      ref={wrapperRef}
      className={clsx("relative inline-flex", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        ref={btnRef}
        type="button"
        aria-describedby={tooltipId}
        aria-expanded={visible}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-[15px] w-[15px] items-center justify-center rounded-full border border-[var(--color-text-faint)] text-[9px] leading-none text-[var(--color-text-faint)] transition-colors duration-150 hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-muted)] focus-visible:border-[var(--color-accent)] focus-visible:text-[var(--color-accent)]"
      >
        ?
      </button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {visible && coords && (
              <motion.div
                ref={tooltipRef}
                id={tooltipId}
                role="tooltip"
                initial={{ opacity: 0, y: coords.placement === "top" ? 4 : -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: coords.placement === "top" ? 4 : -4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{
                  position: "fixed",
                  left: coords.left,
                  width: LARGURA,
                  top: coords.top,
                  bottom: coords.bottom,
                }}
                className="pointer-events-none z-[200] rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 py-2.5 text-[12.5px] leading-relaxed text-[var(--color-text-muted)] shadow-[0_20px_45px_-18px_rgba(0,0,0,0.75)]"
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
