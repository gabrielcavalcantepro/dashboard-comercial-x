import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import { LARGURA_PAGINA, ALTURA_PAGINA } from "./ReportDocument";

async function aguardarImagens(container: HTMLElement): Promise<void> {
  const imagens = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    imagens.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
    ),
  );
}

export async function gerarRelatorioPdf(
  container: HTMLElement,
  nomeArquivo: string,
): Promise<void> {
  await aguardarImagens(container);

  const paginas = Array.from(container.querySelectorAll<HTMLElement>("[data-report-page]"));
  if (paginas.length === 0) throw new Error("Nenhuma página de relatório encontrada.");

  const pdf = new jsPDF({ unit: "px", format: [LARGURA_PAGINA, ALTURA_PAGINA], hotfixes: ["px_scaling"] });

  for (let i = 0; i < paginas.length; i++) {
    const canvas = await html2canvas(paginas[i], {
      backgroundColor: "#151515",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    if (i > 0) pdf.addPage([LARGURA_PAGINA, ALTURA_PAGINA]);
    pdf.addImage(imgData, "JPEG", 0, 0, LARGURA_PAGINA, ALTURA_PAGINA);
  }

  pdf.save(nomeArquivo);
}
