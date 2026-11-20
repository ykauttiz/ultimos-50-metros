"use strict";
const parts = ["calçada", "travessia", "embarque"];
const states = ["Sem vistoria", "Livre na vistoria", "Barreira observada"];
function inspect(record) {
  if (!record || typeof record.point !== "string" || !record.point.trim() || record.point.length > 120)
    throw Error("Informe um ponto de até 120 caracteres.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
      !Number.isFinite(Date.parse(record.date)) ||
      new Date(record.date).toISOString().slice(0,10) !== record.date) throw Error("Data inválida.");
  if (!parts.every(part => states.includes(record[part]))) throw Error("Verifique os três trechos.");
  if (typeof record.note !== "string" || record.note.length > 600) throw Error("Observação inválida.");
  return parts.some(p => record[p] === states[2]) ? "Revisar barreira" :
    parts.some(p => record[p] === states[0]) ? "Completar vistoria" : "Vistoria completa";
}
function queue(records) {
  const latest = new Map();
  for (const r of records) {
    const status = inspect(r), id = r.point.trim().toLocaleLowerCase("pt-BR");
    if (!latest.has(id) || latest.get(id).date <= r.date) latest.set(id, {...r, status});
  }
  const priority = ["Revisar barreira","Completar vistoria","Vistoria completa"];
  return [...latest.values()].sort((a,b) => priority.indexOf(a.status)-priority.indexOf(b.status) || a.date.localeCompare(b.date));
}
if (typeof module !== "undefined") module.exports = {queue, inspect};
