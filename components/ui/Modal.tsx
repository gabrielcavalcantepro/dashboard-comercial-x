"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, description, children, width = 520 }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Guarda a versão mais recente de onClose sem entrar nas dependências do
  // efeito abaixo — chamadoras costumam passar uma closure inline (ex.:
  // `onClose={() => setAberto(false)}`), que muda de identidade a cada
  // render. Se onClose estivesse nas deps, qualquer re-render do formulário
  // dentro do modal (como digitar em um campo controlado) refaria o efeito
  // e chamaria panelRef.current?.focus() de novo, roubando o foco do campo
  // a cada tecla.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{ maxWidth: width }}
            className="relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-7 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)] outline-none"
          >
            <div className="mb-6">
              <div className="flex items-center gap-2.5">
                <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--color-accent)]" />
                <h2 id="modal-title" className="text-xl font-semibold text-[var(--color-text)]">
                  {title}
                </h2>
              </div>
              {description && (
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {description}
                </p>
              )}
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
