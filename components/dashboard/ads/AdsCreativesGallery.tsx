"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { MetaCriativo } from "@/lib/meta-types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";

interface AdsCreativesGalleryProps {
  criativos: MetaCriativo[];
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] text-[var(--color-text-faint)]">{label}</div>
      <div className="text-[12.5px] font-medium tabular-nums text-[var(--color-text)]">{value}</div>
    </div>
  );
}

export function AdsCreativesGallery({ criativos }: AdsCreativesGalleryProps) {
  const [videoAberto, setVideoAberto] = useState<MetaCriativo | null>(null);

  if (criativos.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-[var(--color-text-faint)]">
        Nenhum criativo ativo encontrado no período selecionado.
      </p>
    );
  }

  const clicarThumbnail = (criativo: MetaCriativo) => {
    if (criativo.videoUrl) {
      setVideoAberto(criativo);
    } else if (criativo.instagramPermalink) {
      window.open(criativo.instagramPermalink, "_blank", "noopener,noreferrer");
    }
  };

  const ehClicavel = (c: MetaCriativo) => Boolean(c.videoUrl || c.instagramPermalink);

  return (
    <>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
        {criativos.map((c, i) => {
          const thumb = c.imageUrl ?? c.videoThumbnail;
          const clicavel = ehClicavel(c);
          return (
            <motion.div
              key={c.adId}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.3) }}
            >
              <Card className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => clicavel && clicarThumbnail(c)}
                  disabled={!clicavel}
                  className="group relative block aspect-[4/5] w-full overflow-hidden bg-[var(--color-surface-sunken)]"
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] text-[var(--color-text-faint)]">
                      Sem imagem
                    </div>
                  )}
                  {(c.videoUrl || c.videoId) && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)]">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                          <path d="M3 1.5L12 7L3 12.5V1.5Z" />
                        </svg>
                      </span>
                    </span>
                  )}
                  {c.isInstagramBoost && (
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                      Instagram
                    </span>
                  )}
                </button>
                <div className="p-3">
                  <p className="mb-2.5 truncate text-[12.5px] font-medium text-[var(--color-text)]" title={c.adName}>
                    {c.adName}
                  </p>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-2">
                    <MiniStat label="Invest." value={formatCurrency(c.spend, true)} />
                    <MiniStat label="Conversas" value={formatNumber(c.conversas)} />
                    <MiniStat label="CTR" value={formatPercent(c.ctr, 2)} />
                    <MiniStat label="Impr." value={formatNumber(c.impressions)} />
                    <MiniStat label="Cliques" value={formatNumber(c.clicks)} />
                    <MiniStat label="CPM" value={formatCurrency(c.cpm, true)} />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Modal
        open={videoAberto !== null}
        onClose={() => setVideoAberto(null)}
        title={videoAberto?.adName ?? ""}
        width={640}
      >
        {videoAberto?.videoUrl && (
          <video
            src={videoAberto.videoUrl}
            controls
            autoPlay
            className="w-full rounded-[var(--radius-sm)] bg-black"
          />
        )}
      </Modal>
    </>
  );
}
