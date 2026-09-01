"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { Cliente } from "@/lib/types";

interface ClientFormModalProps {
  open: boolean;
  onClose: () => void;
  cliente?: Cliente;
}

function linkDaPlanilha(cliente: Cliente): string {
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

export function ClientFormModal({ open, onClose, cliente }: ClientFormModalProps) {
  const router = useRouter();
  const { push } = useToast();
  const editando = Boolean(cliente);

  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [segmento, setSegmento] = useState(cliente?.segmento ?? "");
  const [linkPlanilha, setLinkPlanilha] = useState(cliente ? linkDaPlanilha(cliente) : "");
  const [abaNome, setAbaNome] = useState("Leads");
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
      setErro(null);
    }
  }

  const fechar = () => {
    if (enviando) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch(editando ? `/api/clientes/${cliente!.id}` : "/api/clientes", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editando ? { nome, segmento, linkPlanilha } : { nome, segmento, linkPlanilha, abaNome },
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
          ? "Atualize o nome, o segmento ou a planilha conectada deste cliente."
          : "Conecte a planilha do Google Sheets onde a equipe comercial registra os leads."
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
        <TextField
          label="Link da planilha"
          name="linkPlanilha"
          icon={<IconLink />}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          value={linkPlanilha}
          onChange={(e) => setLinkPlanilha(e.target.value)}
          hint='A planilha precisa estar compartilhada como "Qualquer pessoa com o link → Leitor".'
          required
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
              ? "Validando planilha…"
              : editando
                ? "Salvar alterações"
                : "Cadastrar cliente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
