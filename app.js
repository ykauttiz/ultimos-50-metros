"use strict";
const el=id=>document.getElementById(id);
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const message=text=>{el("message").textContent=text;};
const key="ultimos-50-metros.v2",legacy="ultimos-50-metros.v1";
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const empty=()=>({schemaVersion:2,records:[],actions:[]});
let photo = null, photoVersion = 0, processingPhoto = false;
function clearPhoto() {
  photoVersion++; photo = null;processingPhoto = false;
  el("visit-photo").value = "";el("photo-preview").hidden = true;
  el("photo-preview").removeAttribute("src");el("photo-status").textContent = "";
}
el("visit-photo").onchange = async event => {
  const file = event.target.files[0], id = ++photoVersion;
  photo = null;el("photo-preview").hidden = true;processingPhoto = Boolean(file);
  if (!file) {clearPhoto();return;}
  let url;
  try {
    if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 8*1024*1024) throw Error("Use JPG, PNG ou WebP de até 8 MiB.");
    el("photo-status").textContent = "Preparando a cópia local…";
    url = URL.createObjectURL(file);
    const img = new Image();img.src = url;await img.decode();
    if (id !== photoVersion) return;
    const factor = Math.min(1,640/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1,Math.round(img.naturalWidth*factor));canvas.height = Math.max(1,Math.round(img.naturalHeight*factor));
    const ctx = canvas.getContext("2d");ctx.fillStyle = "white";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const jpeg = canvas.toDataURL("image/jpeg",.65);
    if (jpeg.length > 150000) throw Error("Imagem muito detalhada. Recorte o trecho e tente novamente.");
    photo = jpeg;el("photo-preview").src=jpeg;el("photo-preview").hidden=false;
    el("photo-status").textContent="Cópia preparada. Confira antes de salvar.";
  } catch(err) {if (id === photoVersion) {clearPhoto();el("photo-status").textContent=err.message;}}
  finally {if (url) URL.revokeObjectURL(url);if (id === photoVersion) processingPhoto=false;}
};
function read(){return Field.validate(JSON.parse(localStorage.getItem(key)??localStorage.getItem(legacy)??"[]"));}
let selectedVisits=[];
let demo=false,sample=empty(),pending=null,ticket=0,display=empty(),limit=50;
function current(){return demo?sample:read();}
function write(data){
  Field.findings(data);
  if(demo)sample=data;
  else try{localStorage.setItem(key,JSON.stringify(data));}
  catch(err){
    // setItem é atômico: se falhar, o histórico salvo continua como estava.
    const full=err?.name==="QuotaExceededError"||err?.name==="NS_ERROR_DOM_QUOTA_REACHED"||err?.code===22||err?.code===1014;
    throw Error(full?"O navegador ficou sem espaço para salvar. Exporte o histórico e tente de novo. Nada foi alterado.":"Não foi possível salvar neste navegador. Exporte o histórico para não perder dados. Nada foi alterado.");
  }
  draw(data);
}
// Informa se o navegador protegeu o armazenamento contra limpeza automática. Nunca trava: a resposta tem prazo de 3 s.
async function storageNote(){
  try{
    if(!navigator.storage?.persisted)return "";
    let kept=await navigator.storage.persisted();
    if(!kept&&navigator.storage.persist)kept=await Promise.race([navigator.storage.persist(),new Promise(done=>setTimeout(()=>done(false),3000))]);
    return kept?" O navegador protegeu este armazenamento.":" O navegador pode apagar estes dados se faltar espaço; exporte o histórico com frequência.";
  }catch{return "";}
}
function compareVisits() {
  const target = el("visit-comparison"), key = el("compare-point").value;
  target.replaceChildren();
  if (!key) {
    target.append(node("p","Selecione um ponto com vistorias registradas."));
    return;
  }
  const visits = history(display.records.filter(record => pointKey(record.point) === key));
  if (visits.length < 2) {
    target.append(node("p","Este ponto tem uma vistoria. A comparação fica disponível a partir da segunda."));
    return;
  }
  const [latest, previous] = visits;
  target.append(node("p","Anterior: " + previous.date + " · Mais recente: " + latest.date));
  const changes = node("ul");
  for (const part of parts) {
    const before = previous[part], after = latest[part];
    changes.append(node("li",part + ": " + (before === after ? after + " (sem mudança)" : before + " → " + after)));
  }
  target.append(changes);
}
function updateComparison(records) {
  const select = el("compare-point"), previous = select.value;
  const points = new Map(records.map(record => [pointKey(record.point), record.point]));
  select.replaceChildren(new Option("Escolha um ponto",""));
  for (const [key,name] of [...points].sort((a,b) => a[1].localeCompare(b[1],"pt-BR"))) select.add(new Option(name,key));
  if (points.has(previous)) select.value = previous;
  select.disabled = !points.size;
  compareVisits();
}
el("compare-point").onchange = compareVisits;
let fieldIndex = {findings:[],history:[],queue:[]}, priority = "";
const priorityButtons = ["Revisar barreira","Completar vistoria","Vistoria completa"].map(label => {
  const button = node("button");
  button.dataset.priority = label;
  button.onclick = () => {
    priority = priority === label ? "" : label;
    limit = 50;
    drawSelection();
  };
  el("priorities").append(button);
  return button;
});
function draw(data) {
  display = data;
  fieldIndex = {findings:Field.findings(data),history:history(data.records),queue:queue(data.records)};
  updateComparison(data.records);
  drawSelection();
}
function paintMap() {
  if (!el("map-panel").open) return;
  const points = selectedVisits.filter(r => r.coordinates);
  const select = el("map-point"), previous = select.value;
  const unique = new Map(points.map(r => [JSON.stringify([r.point,...r.coordinates]),r]));
  const entries = [...unique.entries()];
  select.replaceChildren(...entries.map(([key,r]) => new Option(r.point,key)));
  if (unique.has(previous)) select.value = previous;
  const canvas = el("point-map"), ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle="#e5ecdb";ctx.fillRect(0,0,w,h);
  if (!entries.length) {el("map-info").textContent="Nenhum ponto com coordenadas na seleção.";return;}
  const chosen = unique.get(select.value);
  const bounds = points.reduce((b,r) => {
    const [x,y] = r.coordinates;
    return [Math.min(b[0],x),Math.max(b[1],x),Math.min(b[2],y),Math.max(b[3],y)];
  },[Infinity,-Infinity,Infinity,-Infinity]);
  const [west,east,south,north] = bounds;
  const aspect = Math.max(.01,Math.cos((south+north)*Math.PI/360));
  const scale = Math.min((w-48)/Math.max((east-west)*aspect,.00001),(h-48)/Math.max(north-south,.00001));
  const dot = (r,radius,color) => {
    const [x,y] = r.coordinates;
    ctx.beginPath();ctx.arc(w/2+(x-(west+east)/2)*aspect*scale,h/2-(y-(south+north)/2)*scale,radius,0,2*Math.PI);
    ctx.fillStyle=color;ctx.fill();
  };
  for (const [,r] of entries) dot(r,5,"#345d4b");
  dot(chosen,10,"#a14d1a");dot(chosen,4,"#fff3cd");
  el("map-info").textContent = entries.length+" ponto(s) · "+chosen.point+" · latitude "+chosen.coordinates[1]+" · longitude "+chosen.coordinates[0];
}
el("map-panel").ontoggle = paintMap;
el("map-point").onchange = paintMap;
function drawSelection() {
  const data = display, findings = fieldIndex.findings, q = pointKey(el("search").value);
  const searched = fieldIndex[el("mode").value].filter(r => pointKey(r.point).includes(q));
  const counts = new Map();
  for (const item of searched) counts.set(item.status,(counts.get(item.status) || 0)+1);
  for (const button of priorityButtons) {
    const label = button.dataset.priority;
    button.textContent = label + " · " + (counts.get(label) || 0);
    button.setAttribute("aria-pressed",String(priority === label));
  }
  const records = priority ? searched.filter(r => r.status === priority) : searched;
  el("priority-summary").textContent = records.length + " vistoria(s) na seleção." + (priority ? " Selecione a prioridade novamente para ver todas." : "");
  selectedVisits=records;paintMap();
  el("csv-visits").disabled = !records.length;
  el("print-visits").disabled = !records.length;
  el("geo").disabled=!records.some(r=>r.coordinates);
  el("rows").replaceChildren(...records.slice(0,limit).map(r=>{const tr=node("tr");for(const value of [r.point,r.date,r.status,...parts.map(p=>r[p]),r.note])tr.append(node("td",value));
    if (r.photo) {
      const details=node("details"),summary=node("summary","Ver foto"),img=node("img");img.alt="Foto do trecho em "+r.point;
      details.ontoggle=()=>{if(details.open)img.src=r.photo;else img.removeAttribute("src");};
      details.append(summary,img);tr.lastElementChild.append(details);
    }
    return tr;}));
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
el("gps").onclick = () => {
  const status = el("gps-status");
  if (!navigator.geolocation) {status.textContent="Localização indisponível. Informe as coordenadas manualmente.";return;}
  const fields = ["lat","lon","point"], initial = fields.map(id => el(id).value);
  el("gps").disabled = true;status.textContent = "Aguardando a posição do aparelho…";
  navigator.geolocation.getCurrentPosition(position => {
    el("gps").disabled = false;
    if (fields.some((id,i) => initial[i] !== el(id).value)) {
      status.textContent = "O formulário mudou. Confira as coordenadas ou solicite a posição novamente.";return;
    }
    el("lat").value = position.coords.latitude.toFixed(6);
    el("lon").value = position.coords.longitude.toFixed(6);
    status.textContent = "Posição preenchida. Precisão informada: " + Math.round(position.coords.accuracy) + " m. Confira antes de salvar.";
  },() => {
    el("gps").disabled = false;status.textContent="Posição indisponível. Você pode digitar latitude e longitude.";
  },{enableHighAccuracy:true,timeout:12000,maximumAge:0});
};
el("date").value=today();
el("visit").onsubmit=e=>{e.preventDefault();try{
  const r={recordedAt:new Date().toISOString(),point:el("point").value.trim(),date:el("date").value,note:el("note").value.trim()};
  for(const p of parts)r[p]=e.target.elements[p].value;
  if(el("lat").value || el("lon").value){
    if(!el("lat").value || !el("lon").value)throw Error("Informe latitude e longitude juntas.");
    r.coordinates=[el("lon").valueAsNumber,el("lat").valueAsNumber];
  }
  if (processingPhoto) return message("Aguarde o preparo da foto.");
  if (photo) r.photo = photo;
  inspect(r);const data=current();
  if(data.records.length && Field.identity(data.records.at(-1))===Field.identity(r) && !data.actions.some(a=>a.point===r.point && a.date===r.date))return message("Esta vistoria já consta no histórico.");
  const next = {...data,records:[...data.records,r]};
  if (new Blob([JSON.stringify(next,null,2)]).size > 4*1024*1024) throw Error("Histórico acima do limite de backup de 4 MiB. Exporte o histórico atual.");
  const saved="Vistoria salva neste navegador.";
  write(next);clearPhoto();message(demo?"Vistoria adicionada ao exemplo.":saved);
  if(!demo)storageNote().then(note=>{if(note&&el("message").textContent===saved)message(saved+note);});
}catch(err){message(err.message);}};
for(const id of ["mode","search","state"])el(id).oninput=()=>{limit=50;drawSelection();};
for(const id of ["more","moreCases"])el(id).onclick=()=>{limit+=50;drawSelection();};
el("demo").onclick=()=>{try{
  const next=demo?read():{schemaVersion:2,records:[{point:"Praça das Flores · sentido centro",date:"2026-10-20",calçada:states[2],travessia:states[0],embarque:states[1],note:"Piso interrompido na esquina."}],actions:[]};
  clearPhoto();demo=!demo;if(demo)sample=next;pending=null;ticket++;el("confirm").hidden=true;draw(next);message(demo?"Você está praticando com dados fictícios.":"Seu histórico foi carregado.");
}catch(err){message(err.message);}};
el("csv-visits").onclick = () => {
  const fields = ["Ponto","Data","Prioridade","Calçada","Travessia","Embarque"];
  const rows = [fields,...selectedVisits.map(v => [v.point,v.date,v.status,...parts.map(p => v[p])])];
  const csv = rows.map(row => row.map(Field.csvCell).join(";")).join("\r\n");
  const link = node("a");
  link.href = URL.createObjectURL(new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}));
  link.download = demo ? "exemplo-vistorias.csv" : "vistorias.csv";
  link.click();setTimeout(() => URL.revokeObjectURL(link.href),1000);
};
function prepareSheet() {
  const sheet = el("visit-sheet");
  const origin = demo ? "Exemplo fictício" : "Histórico deste navegador";
  sheet.replaceChildren(node("h1","Últimos 50 Metros"),node("p",origin + " · " + selectedVisits.length + " vistoria(s) selecionada(s)"));
  const table = node("table"), head = table.createTHead().insertRow();
  for (const label of ["Ponto","Data","Prioridade","Calçada","Travessia","Embarque"]) {
    const th = node("th",label);th.scope = "col";head.append(th);
  }
  const body = table.createTBody();
  for (const visit of selectedVisits) {
    const row = body.insertRow();
    for (const value of [visit.point,visit.date,visit.status,...parts.map(part => visit[part])]) row.append(node("td",value));
  }
  sheet.append(table);
}
window.addEventListener("beforeprint",prepareSheet);
window.addEventListener("afterprint",() => el("visit-sheet").replaceChildren());
el("print-visits").onclick = () => window.print();
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
