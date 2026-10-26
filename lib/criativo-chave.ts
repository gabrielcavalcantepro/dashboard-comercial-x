// Identidade de um criativo, igual dos dois lados: na mensagem do WhatsApp
// (anúncio de origem do lead) e na conta de anúncios do Meta.
//
// Vídeo: a miniatura aponta sempre para o mesmo arquivo, em todos os posts e
// anúncios que usam o vídeo — o nome do arquivo é a chave.
// Imagem: a mensagem não traz miniatura nem arquivo, e os posts do Facebook
// não dizem de qual anúncio são. A chave é o texto do anúncio, então imagens
// com o mesmo texto aparecem juntas.

export function chaveDeMiniatura(url: string | null | undefined): string | null {
  const arquivo = url?.split("?")[0].split("/").pop();
  const m = arquivo?.match(/^(.+?)(?:_n)?\.(?:jpe?g|png|webp)$/i);
  return m ? m[1] : null;
}

export function chaveDeTexto(texto: string | null | undefined): string | null {
  const normalizado = (texto ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalizado) return null;
  // djb2: curto, estável e suficiente para distinguir os textos de uma conta.
  let hash = 5381;
  for (let i = 0; i < normalizado.length; i++) hash = ((hash * 33) ^ normalizado.charCodeAt(i)) >>> 0;
  return `txt_${hash.toString(36)}`;
}
