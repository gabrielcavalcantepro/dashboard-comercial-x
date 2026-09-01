"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { InfoTip } from "@/components/ui/InfoTip";
import { Card } from "@/components/ui/Card";

interface ChartPanelProps {
  title: string;
  tooltip: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  delay?: number;
}

export function ChartPanel({ title, tooltip, children, className, action, delay = 0 }: ChartPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className={clsx("flex", className)}
    >
      <Card className="flex w-full flex-col p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <h3 className="text-[14.5px] font-medium text-[var(--color-text)]">{title}</h3>
          <div className="flex items-center gap-2.5">
            {action}
            <InfoTip align="right">{tooltip}</InfoTip>
          </div>
        </div>
        <div className="flex-1">{children}</div>
      </Card>
    </motion.div>
  );
}
