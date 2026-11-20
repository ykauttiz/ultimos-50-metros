"use strict";
const find = selector => document.querySelector(selector);
function show(rows) {
  const body = find("tbody");
  body.replaceChildren();
  for (const values of rows) {
    const row = body.insertRow();
    for (const value of values) row.insertCell().textContent = value;
  }
}
const key = "ultimos-50-metros.v1";
function read() {
  const records = JSON.parse(localStorage.getItem(key) || "[]");
  if (!Array.isArray(records)) throw Error("Histórico inválido.");
  records.forEach(inspect);
  return records;
}
const draw = records => show(queue(records).map(r=>[r.point,r.date,r.status,r.note]));
for (const part of parts) {
  const label = document.createElement("label"), select = document.createElement("select");
  label.textContent = part;
  select.name = part;
  for (const state of states) select.add(new Option(state,state));
  label.append(select);find("#parts").append(label);
}
const today = new Date();
find("#date").value = new Date(today - today.getTimezoneOffset()*60000).toISOString().slice(0,10);
find("form").onsubmit = event => {
  event.preventDefault();
  const record = {point:find("#point").value.trim(),date:find("#date").value,note:find("#note").value};
  for (const part of parts) record[part] = event.target.elements[part].value;
  try {
    inspect(record);
    const records = [...read(),record];
    localStorage.setItem(key,JSON.stringify(records));
    draw(records);find("#message").textContent = "Vistoria salva neste navegador.";
  } catch(error) {find("#message").textContent = error.message;}
};
find("#demo").onclick = () => {
  draw([{point:"Praça das Flores · exemplo",date:"2026-11-20",calçada:states[2],travessia:states[0],embarque:states[1],note:"Calçada interrompida junto à esquina."}]);
  find("#message").textContent = "Exemplo fictício. Seu histórico está preservado.";
};
find("#export").onclick = () => {
  try {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify(read(),null,2)],{type:"application/json"}));
    link.download = "vistorias.json";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  } catch(error) {find("#message").textContent = error.message;}
};
try {draw(read());} catch(error) {find("#message").textContent = error.message;}
