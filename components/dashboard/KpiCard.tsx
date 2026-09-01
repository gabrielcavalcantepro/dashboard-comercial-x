"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { InfoTip } from "@/components/ui/InfoTip";
import { Card } from "@/components/ui/Card";

interface KpiCardProps {
  label: string;
  value: string;
  tooltip: string;
  variacao?: number | null;
  variacaoUnidade?: "%" | "p.p.";
  positivoQuandoSobe?: boolean;
  hero?: boolean;
  delay?: number;
}

export function KpiCard({
  label,
  value,
  tooltip,
  variacao,
  variacaoUnidade = "%",
  positivoQuandoSobe = true,
  hero = false,
  delay = 0,
}: KpiCardProps) {
  const temVariacao = variacao !== undefined && variacao !== null;
  const subiu = temVariacao && variacao! > 0.05;
  const desceu = temVariacao && variacao! < -0.05;
  const ehBom = subiu ? positivoQuandoSobe : desceu ? !positivoQuandoSobe : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card
        variant={hero ? "raised" : "default"}
        className={clsx("flex h-full flex-col justify-between gap-3", hero ? "p-6" : "p-5")}
      >
        <div className="flex items-start justify-between gap-2">
          <span className={clsx("text-[13px] text-[var(--color-text-muted)]", hero && "text-[13.5px]")}>
            {label}
          </span>
          <InfoTip align="right">{tooltip}</InfoTip>
        </div>
        <div className="flex items-end justify-between gap-3">
          <span
            className={clsx(
              "font-semibold tabular-nums text-[var(--color-text)]",
              hero ? "text-[34px] leading-none sm:text-[38px]" : "text-[24px] leading-none",
            )}
          >
            {value}
          </span>
          {temVariacao && (subiu || desceu) && (
            <span
              className={clsx(
                "mb-0.5 flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-medium",
                ehBom
                  ? "bg-[rgba(123,227,168,0.12)] text-[var(--color-positive)]"
                  : "bg-[rgba(255,111,112,0.12)] text-[var(--color-negative)]",
              )}
            >
              {subiu ? "↑" : "↓"}
              {Math.abs(variacao!).toFixed(1).replace(".", ",")}
              {variacaoUnidade}
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
