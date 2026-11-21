"use strict";
const el=id=>document.getElementById(id);
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const message=text=>{el("message").textContent=text;};
const key="ultimos-50-metros.v2",legacy="ultimos-50-metros.v1";
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const empty=()=>({schemaVersion:2,records:[],actions:[]});
function read(){return Field.validate(JSON.parse(localStorage.getItem(key)??localStorage.getItem(legacy)??"[]"));}
let selectedVisits=[];
let demo=false,sample=empty(),pending=null,ticket=0,display=empty(),limit=50;
function current(){return demo?sample:read();}
function write(data){
  Field.findings(data);
  if(demo)sample=data;else localStorage.setItem(key,JSON.stringify(data));
  draw(data);
}
function draw(data){
  const findings=Field.findings(data),q=el("search").value.toLocaleLowerCase("pt-BR");
  display=data;
  const records=(el("mode").value==="history"?history(data.records):queue(data.records)).filter(r=>r.point.toLocaleLowerCase("pt-BR").includes(q));
  selectedVisits=records;
  el("geo").disabled=!records.some(r=>r.coordinates);
  el("rows").replaceChildren(...records.slice(0,limit).map(r=>{const tr=node("tr");for(const value of [r.point,r.date,r.status,...parts.map(p=>r[p]),r.note])tr.append(node("td",value));return tr;}));
  el("more").hidden=records.length<=limit;
  el("summary").textContent=data.records.length+" vistoria(s) · "+findings.filter(i=>i.state!=="Verificada").length+" ocorrência(s) em acompanhamento";
  el("origin").textContent=demo?"Exemplo fictício":"Histórico deste navegador";
  el("demo").textContent=demo?"Voltar ao meu histórico":"Ver exemplo fictício";
  const list=findings.filter(i=>i.point.toLocaleLowerCase("pt-BR").includes(q) && (!el("state").value||i.state===el("state").value));
  el("cases").replaceChildren(...list.slice(0,limit).map(card));
  if(!list.length)el("cases").append(node("p","Nenhuma ocorrência nesta seleção."));
  el("moreCases").hidden=list.length<=limit;
}
function card(item){
  const details=node("details"),s=node("summary",item.point+" · "+item.part+" · "+item.state);details.append(s);
  const list=node("ol");const labels={observed:"Barreira observada",correction:"Correção informada",verified:"Verificação confirmou a correção",reopened:"Barreira persiste"};
  for(const a of item.events)list.append(node("li",a.date+" · "+labels[a.type]+(a.note?" — "+a.note:"")));
  details.append(list);
  if(item.state==="Verificada")return details;
  const form=node("form");form.className="action";
  const field=(label,input)=>{const l=node("label",label);l.append(input);form.append(l);};
  const date=node("input");date.type="date";date.required=true;date.min=item.last;date.value=today();field("Data da ação",date);
  const kind=node("select");
  for(const t of (item.state==="Aberta"?["correction"]:["verified","reopened"]))kind.add(new Option(labels[t],t));
  field("Etapa",kind);
  const note=node("textarea");note.required=true;note.maxLength=600;field("Descreva o que foi feito ou verificado",note);
  form.append(node("button","Registrar etapa"));details.append(form);
  form.onsubmit=e=>{e.preventDefault();try{
    const data=current();
    data.actions.push({id:crypto.randomUUID(),recordedAt:new Date().toISOString(),point:item.point,part:item.part,type:kind.value,date:date.value,note:note.value.trim()});
    write(data);message("Etapa registrada"+(demo?" no exemplo.":"."));
  }catch(err){message(err.message);}};
  return details;
}
for(const p of parts){
  const label=node("label",p),select=node("select");select.name=p;
  for(const state of states)select.add(new Option(state,state));label.append(select);el("parts").append(label);
}
el("date").value=today();
el("visit").onsubmit=e=>{e.preventDefault();try{
  const r={recordedAt:new Date().toISOString(),point:el("point").value.trim(),date:el("date").value,note:el("note").value.trim()};
  for(const p of parts)r[p]=e.target.elements[p].value;
  if(el("lat").value || el("lon").value){
    if(!el("lat").value || !el("lon").value)throw Error("Informe latitude e longitude juntas.");
    r.coordinates=[el("lon").valueAsNumber,el("lat").valueAsNumber];
  }
  inspect(r);const data=current();
  if(data.records.length && Field.identity(data.records.at(-1))===Field.identity(r) && !data.actions.some(a=>a.point===r.point && a.date===r.date))return message("Esta vistoria já consta no histórico.");
  data.records.push(r);write(data);message(demo?"Vistoria adicionada ao exemplo.":"Vistoria salva neste navegador.");
}catch(err){message(err.message);}};
for(const id of ["mode","search","state"])el(id).oninput=()=>{limit=50;draw(display);};
for(const id of ["more","moreCases"])el(id).onclick=()=>{limit+=50;draw(display);};
el("demo").onclick=()=>{try{
  const next=demo?read():{schemaVersion:2,records:[{point:"Praça das Flores · sentido centro",date:"2026-10-20",calçada:states[2],travessia:states[0],embarque:states[1],note:"Piso interrompido na esquina."}],actions:[]};
  demo=!demo;if(demo)sample=next;pending=null;ticket++;el("confirm").hidden=true;draw(next);message(demo?"Você está praticando com dados fictícios.":"Seu histórico foi carregado.");
}catch(err){message(err.message);}};
el("geo").onclick=()=>{
  const collection=Field.geojson(selectedVisits);
  const link=node("a");
  link.href=URL.createObjectURL(new Blob([JSON.stringify(collection)],{type:"application/geo+json"}));
  link.download=demo?"exemplo.geojson":"vistorias.geojson";link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  message(collection.features.length+" vistoria(s) com coordenadas exportada(s).");
};
el("export").onclick=()=>{try{const link=node("a");link.href=URL.createObjectURL(new Blob([JSON.stringify(current(),null,2)],{type:"application/json"}));link.download=demo?"exemplo-vistorias.json":"vistorias.json";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}catch(err){message(err.message);}};
el("restore").onchange=async e=>{
  const file=e.target.files[0],id=++ticket;pending=null;el("confirm").hidden=true;if(!file)return;
  try{if(file.size>4*1024*1024)throw Error("Use um backup de até 4 MiB.");
    const candidate=JSON.parse(await file.text());if(id!==ticket)return;
    const base=current(),next=Field.merge(base,candidate);pending=candidate;
    message("Prévia: "+(next.records.length-base.records.length)+" nova(s) vistoria(s) e "+(next.actions.length-base.actions.length)+" nova(s) ação(ões).");
    el("confirm").hidden=false;
  }catch(err){if(id===ticket)message(err.message);}finally{if(id===ticket)e.target.value="";}
};
el("confirm").onclick=()=>{if(!pending)return;try{write(Field.merge(current(),pending));pending=null;el("confirm").hidden=true;message("Backup incorporado.");}catch(err){message(err.message);}};
window.addEventListener("storage",()=>{if(!demo)try{draw(read());}catch(err){message(err.message);}});
try{draw(read());}catch(err){message(err.message);}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  el("offline").hidden=false;
  el("offline").onclick=async ()=>{
    el("offline").disabled=true;
    el("offline-status").textContent="Guardando o aplicativo neste navegador…";
    try {
      const registration=await navigator.serviceWorker.register("./sw.js");
      const worker=registration.installing;
      if (worker && worker.state !== "activated" && !registration.active) {
        await new Promise((resolve,reject)=>{
          const check=()=>{
            if(worker.state==="activated"){worker.removeEventListener("statechange",check);resolve();}
            if(worker.state==="redundant"){worker.removeEventListener("statechange",check);reject(Error());}
          };
          worker.addEventListener("statechange",check);check();
        });
      }
      await navigator.serviceWorker.ready;
      el("offline-status").textContent="Pronto. Você pode reabrir esta página sem internet neste navegador.";
    } catch {
      el("offline-status").textContent="Não foi possível guardar o aplicativo. Tente novamente com conexão.";
    } finally {el("offline").disabled=false;}
  };
}
