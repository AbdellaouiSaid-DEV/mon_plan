"use strict";
/* ==========================================================================
   xlsx.js — export de l'historique en vrai fichier Excel (.xlsx), sans bibliothèque.
   Un .xlsx est un dossier compressé (zip) de petits fichiers XML : on l'écrit à la main.
   ========================================================================== */
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipStore(fichiers) {            // fichiers = { "chemin": "texte" } → Uint8Array (zip sans compression)
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  const u16 = n => [n & 255, (n >> 8) & 255], u32 = n => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  for (const [nom, txt] of Object.entries(fichiers)) {
    const nm = enc.encode(nom), data = enc.encode(txt), crc = crc32(data);
    const head = [0x50, 0x4B, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nm.length), ...u16(0)];
    parts.push(new Uint8Array(head), nm, data);
    central.push(new Uint8Array([0x50, 0x4B, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nm.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nm);
    off += head.length + nm.length + data.length;
  }
  const taille = central.reduce((s, x) => s + x.length, 0), n = Object.keys(fichiers).length;
  parts.push(...central, new Uint8Array([0x50, 0x4B, 5, 6, 0, 0, 0, 0, ...u16(n), ...u16(n), ...u32(taille), ...u32(off), 0, 0]));
  const out = new Uint8Array(off + taille + 22); let p = 0; parts.forEach(x => { out.set(x, p); p += x.length; }); return out;
}
const xe = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
const colXL = i => String.fromCharCode(65 + i);
const serial = k => Math.round((Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5);
// feuille : en-têtes + lignes ; une valeur { d: "2026-10-26" } = date, nombre = nombre, sinon texte
function feuilleXML(entetes, lignes, largeurs) {
  const cell = (v, r, c) => { const ref = colXL(c) + r;
    if (v && typeof v === "object") return `<c r="${ref}" s="2"><v>${serial(v.d)}</v></c>`;
    if (typeof v === "number") return `<c r="${ref}"><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"><is><t>${xe(v ?? "")}</t></is></c>`; };
  const rows = [`<row r="1">${entetes.map((h, c) => `<c r="${colXL(c)}1" s="1" t="inlineStr"><is><t>${xe(h)}</t></is></c>`).join("")}</row>`]
    .concat(lignes.map((l, i) => `<row r="${i + 2}">${l.map((v, c) => cell(v, i + 2, c)).join("")}</row>`));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${largeurs.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${rows.join("")}</sheetData>` +
    `<autoFilter ref="A1:${colXL(entetes.length - 1)}${lignes.length + 1}"/></worksheet>`;
}
function construireXLSX() {
  const ks = joursEcoules(), T = [], J = [], agg = {};
  ks.forEach(k => {
    const e = state.days[k], d = parseIso(k), passe = d < aujourdhui();
    (e.tasks || []).forEach(t => {
      T.push([{ d: k }, JOURS[jourIdx(d)], TYPES[e.t].nom, t.h || "", t.act, t.cat, t.dom, t.min, t.ok ? "Oui" : "Non", t.src, e.note || ""]);
      if (passe) { const a = (agg[t.act] ||= { cat: t.cat, dom: t.dom, n: 0, ok: 0 }); a.n++; a.ok += t.ok; }
    });
    J.push([{ d: k }, JOURS[jourIdx(d)], TYPES[e.t].nom, e.tp || 0, e.td || 0, e.pp ? Math.round(1000 * e.pd / e.pp) / 10 : "", e.sp || 0, e.sd || 0, e.sport || 0, e.note || ""]);
  });
  const P = Object.entries(agg).sort((a, b) => a[0].localeCompare(b[0])).map(([n, a]) => [n, a.cat, a.dom, a.n, a.ok, a.n - a.ok, Math.round(1000 * a.ok / a.n) / 10]);
  const sheets = [
    ["Tâches", feuilleXML(["Date", "Jour", "Type de journée", "Heure", "Tâche", "Catégorie", "Matière", "Durée (min)", "Réalisée", "Origine", "Note du jour"], T, [12, 11, 16, 8, 38, 12, 14, 12, 10, 10, 30])],
    ["Journées", feuilleXML(["Date", "Jour", "Type de journée", "Tâches prévues", "Tâches faites", "% du temps réalisé", "Étude prévue (min)", "Étude faite (min)", "Séances de sport", "Note"], J, [12, 11, 16, 14, 13, 16, 17, 16, 15, 30])],
    ["Par tâche", feuilleXML(["Tâche", "Catégorie", "Matière", "Fois proposée", "Fois réalisée", "Fois non réalisée", "Taux de réalisation (%)"], P, [38, 12, 14, 14, 14, 16, 20])]];
  const ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"', hd = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const f = {
    "[Content_Types].xml": hd + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") + "</Types>",
    "_rels/.rels": hd + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": hd + `<workbook ${ns} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([n], i) => `<sheet name="${xe(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": hd + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": hd + `<styleSheet ${ns}><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF12263F"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
  };
  sheets.forEach(([, x], i) => f[`xl/worksheets/sheet${i + 1}.xml`] = x);
  return zipStore(f);
}
function exporterExcel() {
  if (!joursEcoules().length) { toast("Rien à exporter pour l'instant"); return; }
  const blob = new Blob([construireXLSX()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mon-plan-historique-" + iso(aujourdhui()) + ".xlsx";
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  toast("Fichier Excel téléchargé ✔");
}
