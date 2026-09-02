"use client";

import { motion } from "framer-motion";

interface PresentationButtonProps {
  onClick: () => void;
}

export function PresentationButton({ onClick }: PresentationButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className="fixed bottom-7 right-7 z-[80] flex items-center gap-2.5 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-5 py-3.5 text-[13.5px] font-medium text-[var(--color-text)] shadow-[0_25px_60px_-20px_rgba(0,0,0,0.85)] backdrop-blur-sm transition-colors hover:border-[var(--color-accent-border)] hover:text-[var(--color-accent)]"
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path
          d="M1.5 5.5V2.5C1.5 1.94772 1.94772 1.5 2.5 1.5H5.5M10.5 1.5H13.5C14.0523 1.5 14.5 1.94772 14.5 2.5V5.5M14.5 10.5V13.5C14.5 14.0523 14.0523 14.5 13.5 14.5H10.5M5.5 14.5H2.5C1.94772 14.5 1.5 14.0523 1.5 13.5V10.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Modo Apresentação
    </motion.button>
  );
}
