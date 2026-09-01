"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { formatRelativeTime } from "@/lib/format";
import { Toggle } from "@/components/ui/Toggle";

interface LiveIndicatorProps {
  atualizadoEm: number | null;
  pausado: boolean;
  alternarPausado: () => void;
  avisoDiscreto: string | null;
}

export function LiveIndicator({
  atualizadoEm,
  pausado,
  alternarPausado,
  avisoDiscreto,
}: LiveIndicatorProps) {
  const [agora, setAgora] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3 text-[12.5px] text-[var(--color-text-faint)]">
      <div className="flex items-center gap-1.5" title={avisoDiscreto ?? undefined}>
        <span
          className={clsx(
            "h-[6px] w-[6px] rounded-full",
            avisoDiscreto
              ? "bg-[var(--color-negative)]"
              : pausado
                ? "bg-[var(--color-text-faint)]"
                : "bg-[var(--color-positive)]",
          )}
          style={!pausado && !avisoDiscreto ? { animation: "pulse-dot 2s ease-in-out infinite" } : undefined}
        />
        <span>
          {pausado
            ? "Atualização pausada"
            : atualizadoEm
              ? `Atualizado ${formatRelativeTime(atualizadoEm, agora ?? atualizadoEm)}`
              : "Carregando…"}
        </span>
      </div>
      <Toggle checked={!pausado} onChange={alternarPausado} label="Ao vivo" />
    </div>
  );
}
