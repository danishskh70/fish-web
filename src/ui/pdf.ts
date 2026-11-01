// STUB receipt PDF made in the browser (plain text page). The real one is made by the backend
// with reportlab (see BACKEND_GUIDE.md) and downloaded from /receipts/{id}.pdf.
function esc(s: string) { return s.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, (c) => (c === "₹" ? "Rs." : "?")); }
export function makePdf(lines: { text: string; size?: number; bold?: boolean; gap?: number }[]): Blob {
  let y = 790;
  const ops: string[] = [];
  for (const l of lines) {
    const size = l.size ?? 12;
    ops.push(`BT /${l.bold ? "F2" : "F1"} ${size} Tf 56 ${y} Td (${esc(l.text)}) Tj ET`);
    y -= size + (l.gap ?? 10);
  }
  const content = ops.join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  ];
  let out = "%PDF-1.4\n";
  const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: "application/pdf" });
}
export async function shareOrDownload(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title }); return "shared" as const; } catch (e) { if ((e as DOMException).name === "AbortError") return "cancelled" as const; } }
  download(blob, filename);
  return "downloaded" as const;
}
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
