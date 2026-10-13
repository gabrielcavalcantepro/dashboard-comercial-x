"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Select, type SelectOption } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ClientePublico } from "@/lib/types";

interface ClientFormModalProps {
  open: boolean;
  onClose: () => void;
  cliente?: ClientePublico;
}

function linkDaPlanilha(cliente: ClientePublico): string {
  if (!cliente.sheetId) return "";
  return `https://docs.google.com/spreadsheets/d/${cliente.sheetId}/edit`;
}

function IconNome() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 6.2L7 2L12 6.2V12H2V6.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5.3 12V8.2H8.7V12" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function IconSegmento() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M7.3 1.5H12V6.2L6.3 12L1.5 7.2L7.3 1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="9.8" cy="4" r="0.9" fill="currentColor" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M6.3 3.6L7.4 2.5C8.4 1.5 10 1.5 11 2.5C12 3.5 12 5.1 11 6.1L9.9 7.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M7.7 10.4L6.6 11.5C5.6 12.5 4 12.5 3 11.5C2 10.5 2 8.9 3 7.9L4.1 6.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path d="M5.3 8.7L8.7 5.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconAba() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 5.3H12.5M5.3 1.5V12.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IconConta() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 5.8H12.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.5 8.2H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconChave() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="4.5" cy="9.5" r="3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.6 7.4L12.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9.5 4.5L11.3 6.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function ClientFormModal({ open, onClose, cliente }: ClientFormModalProps) {
  const router = useRouter();
  const { push } = useToast();
  const editando = Boolean(cliente);

  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [segmento, setSegmento] = useState(cliente?.segmento ?? "");
  const [linkPlanilha, setLinkPlanilha] = useState(cliente ? linkDaPlanilha(cliente) : "");
  const [abaNome, setAbaNome] = useState("Leads");
  const [funilSeq, setFunilSeq] = useState(String(cliente?.pipefacilPipelineSeq ?? ""));
  const [funis, setFunis] = useState<SelectOption[]>([]);
  const [erroFunis, setErroFunis] = useState<string | null>(null);
  const [metaAdAccountId, setMetaAdAccountId] = useState(cliente?.metaAdAccountId ?? "");
  // O token nunca chega ao navegador (ver ClientePublico) — o campo começa
  // sempre vazio; deixar vazio ao salvar mantém o token já configurado.
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Reidrata o formulário sempre que o modal abre — ajustado durante a
  // renderização (não em efeito) seguindo o padrão recomendado pelo React
  // para resetar estado quando uma prop muda.
  const [openAnterior, setOpenAnterior] = useState(open);
  if (open !== openAnterior) {
    setOpenAnterior(open);
    if (open) {
      setNome(cliente?.nome ?? "");
      setSegmento(cliente?.segmento ?? "");
      setLinkPlanilha(cliente ? linkDaPlanilha(cliente) : "");
      setAbaNome("Leads");
      setFunilSeq(String(cliente?.pipefacilPipelineSeq ?? ""));
      setMetaAdAccountId(cliente?.metaAdAccountId ?? "");
      setMetaAccessToken("");
      setErro(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    fetch("/api/pipefacil/funis")
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        if (!ativo) return;
        if (!ok) {
          setErroFunis(data.erro ?? "Não foi possível listar os funis do PipeFácil.");
          return;
        }
        setErroFunis(null);
        setFunis(
          (data.funis as { seq: number; nome: string }[]).map((f) => ({
            value: String(f.seq),
            label: f.nome,
          })),
        );
      })
      .catch(() => ativo && setErroFunis("Não foi possível listar os funis do PipeFácil."));
    return () => {
      ativo = false;
    };
  }, [open]);

  const fechar = () => {
    if (enviando) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const pipefacilPipelineSeq = funilSeq ? Number(funilSeq) : null;
    try {
      const res = await fetch(editando ? `/api/clientes/${cliente!.id}` : "/api/clientes", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editando
            ? { nome, segmento, linkPlanilha, pipefacilPipelineSeq, metaAdAccountId, metaAccessToken }
            : { nome, segmento, linkPlanilha, abaNome, pipefacilPipelineSeq, metaAdAccountId, metaAccessToken },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível salvar o cliente.");
        setEnviando(false);
        return;
      }
      push(
        editando
          ? `Cliente "${data.cliente.nome}" atualizado com sucesso.`
          : `Cliente "${data.cliente.nome}" cadastrado com sucesso.`,
        "success",
      );
      onClose();
      router.refresh();
    } catch {
      setErro("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={fechar}
      title={editando ? "Editar cliente" : "Adicionar cliente"}
      description={
        editando
          ? "Atualize o nome, o segmento ou as fontes de leads deste cliente."
          : "Conecte o funil do PipeFácil onde a equipe comercial trabalha os leads."
      }
      width={480}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          label="Nome do cliente"
          name="nome"
          icon={<IconNome />}
          placeholder="Ex.: Clínica Sorriso Perfeito"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          disabled={enviando}
        />
        <TextField
          label="Segmento"
          name="segmento"
          icon={<IconSegmento />}
          placeholder="Ex.: Odontologia, Dermatologia, Estética..."
          value={segmento}
          onChange={(e) => setSegmento(e.target.value)}
          required
          disabled={enviando}
        />
        <div className="flex flex-col gap-1.5">
          <Select
            label="Funil no PipeFácil"
            options={[{ value: "", label: "Nenhum (só planilha)" }, ...funis]}
            value={funilSeq}
            onChange={setFunilSeq}
          />
          <span
            className={
              erroFunis
                ? "text-[12px] text-[var(--color-negative)]"
                : "text-[12px] text-[var(--color-text-faint)]"
            }
          >
            {erroFunis ?? "Os leads desse funil alimentam o painel em tempo real."}
          </span>
        </div>
        <TextField
          label="Link da planilha (opcional com funil)"
          name="linkPlanilha"
          icon={<IconLink />}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          value={linkPlanilha}
          onChange={(e) => setLinkPlanilha(e.target.value)}
          hint='Com funil conectado, os leads da planilha são somados aos do CRM como histórico. Precisa estar compartilhada como "Qualquer pessoa com o link → Leitor".'
          disabled={enviando}
        />
        {!editando && (
          <TextField
            label="Nome da aba"
            name="abaNome"
            icon={<IconAba />}
            placeholder="Leads"
            value={abaNome}
            onChange={(e) => setAbaNome(e.target.value)}
            hint="O nome exatamente como aparece na aba do Google Sheets."
            disabled={enviando}
          />
        )}

        <div className="flex items-center gap-2.5 pt-1">
          <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-[var(--color-accent)]" />
          <span className="text-[13px] font-medium text-[var(--color-text)]">Meta Ads (opcional)</span>
        </div>
        <TextField
          label="ID da conta de anúncio"
          name="metaAdAccountId"
          icon={<IconConta />}
          placeholder="Ex.: 1170225954349270"
          value={metaAdAccountId}
          onChange={(e) => setMetaAdAccountId(e.target.value)}
          hint='Com ou sem o prefixo "act_" — funciona dos dois jeitos.'
          disabled={enviando}
        />
        <TextField
          label="Token de acesso"
          name="metaAccessToken"
          type="password"
          icon={<IconChave />}
          placeholder={
            cliente?.temTokenConfigurado
              ? "•••••••• (já configurado — deixe em branco para manter)"
              : "Token de acesso do Meta Ads"
          }
          value={metaAccessToken}
          onChange={(e) => setMetaAccessToken(e.target.value)}
          hint="Fica salvo só no servidor — nunca é enviado ao navegador de quem visualiza o painel."
          disabled={enviando}
        />

        {erro && (
          <div className="rounded-[var(--radius-sm)] border border-[rgba(255,111,112,0.35)] bg-[rgba(255,111,112,0.08)] px-3.5 py-3 text-[13px] leading-relaxed text-[var(--color-negative)]">
            {erro}
          </div>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={fechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={enviando}>
            {enviando
              ? "Validando…"
              : editando
                ? "Salvar alterações"
                : "Cadastrar cliente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
