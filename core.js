"use strict";
const parts = ["calçada", "travessia", "embarque"];
const states = ["Sem vistoria", "Livre na vistoria", "Barreira observada"];
function inspect(record) {
  if (!record || typeof record.point !== "string" || !record.point.trim() || record.point.length > 120)
    throw Error("Informe um ponto de até 120 caracteres.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
      !Number.isFinite(Date.parse(record.date)) ||
      new Date(record.date).toISOString().slice(0,10) !== record.date) throw Error("Data inválida.");
  if (record.photo !== undefined && (typeof record.photo !== "string" || record.photo.length > 150000 ||
      !/^data:image\/jpeg;base64,\/9j\/[a-zA-Z0-9+/]*={0,2}$/.test(record.photo))) throw Error("Foto incompatível.");
  const xy = record.coordinates;
  if (xy !== undefined && (!Array.isArray(xy) || xy.length !== 2 || !xy.every(Number.isFinite) ||
      Math.abs(xy[0]) > 180 || Math.abs(xy[1]) > 90)) throw Error("Coordenadas inválidas.");
  if (!parts.every(part => states.includes(record[part]))) throw Error("Verifique os três trechos.");
  if (typeof record.note !== "string" || record.note.length > 600) throw Error("Observação inválida.");
  return parts.some(p => record[p] === states[2]) ? "Revisar barreira" :
    parts.some(p => record[p] === states[0]) ? "Completar vistoria" : "Vistoria completa";
}
function compareVisitTime(a,b) {
  return a.date.localeCompare(b.date) || (a.recordedAt || "").localeCompare(b.recordedAt || "");
}
function pointKey(name) {
  return name.trim().normalize("NFC").toLocaleLowerCase("pt-BR");
}
function queue(records) {
  const latest = new Map();
  for (const r of records) {
    const status = inspect(r), id = pointKey(r.point);
    if (!latest.has(id) || compareVisitTime(latest.get(id),r) <= 0) latest.set(id, {...r, status});
  }
  const priority = ["Revisar barreira","Completar vistoria","Vistoria completa"];
  return [...latest.values()].sort((a,b) => priority.indexOf(a.status)-priority.indexOf(b.status) || a.date.localeCompare(b.date));
}
function mergeHistory(current, incoming) {
  if (!Array.isArray(incoming)) throw Error("O backup precisa conter uma lista de vistorias.");
  const signature = r => JSON.stringify([pointKey(r.point), r.date,
    ...parts.map(part => r[part]), r.note, r.recordedAt || "", r.coordinates || null,r.photo || null]);
  const seen = new Set(current.map(signature));
  const additions = [];
  for (const record of incoming) {
    inspect(record);
    const id = signature(record);
    if (!seen.has(id)) {
      seen.add(id);
      additions.push(record);
    }
  }
  // Registros locais ganham o desempate quando duas observações têm a mesma data.
  return [...additions, ...current];
}
function history(records) {
  return records.slice().reverse().map(record => ({...record, status: inspect(record)}))
    .sort((a,b) => compareVisitTime(b,a));
}
if (typeof module !== "undefined") module.exports = {queue, inspect, mergeHistory, history};
