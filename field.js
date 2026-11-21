"use strict";
const Field = (() => {
  const model = typeof require === "function" ? require("./core") : {inspect,mergeHistory};
  const segments=["calçada","travessia","embarque"];
  const norm=s=>s.trim().normalize("NFC").toLocaleLowerCase("pt-BR");
  const identity=r=>JSON.stringify([norm(r.point),r.date,...segments.map(p=>r[p]),r.note,r.coordinates || null,r.photo || null]);
  const key=(point,part)=>JSON.stringify([norm(point),part]);
  function validate(data) {
    if(Array.isArray(data))data={schemaVersion:2,records:data,actions:[]};
    if(data?.schemaVersion!==2 || !Array.isArray(data.records) || !Array.isArray(data.actions) ||
       data.records.length+data.actions.length>12000)throw Error("Backup incompatível ou acima de 12 mil registros.");
    function checkTime(r){
      if(r.recordedAt!==undefined && (typeof r.recordedAt!=="string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(r.recordedAt) || !Number.isFinite(Date.parse(r.recordedAt))))throw Error("Horário de registro inválido.");
    }
    data.records.forEach(r=>{model.inspect(r);checkTime(r);});
    const ids=new Set();
    for(const a of data.actions){
      if(!a || typeof a.id!=="string" || !a.id || a.id.length>128 || ids.has(a.id) ||
         !["correction","verified","reopened"].includes(a.type) || !segments.includes(a.part) ||
         typeof a.note!=="string" || !a.note.trim() || a.note.length>600)throw Error("Ação inválida ou ID repetido.");
      model.inspect({point:a.point,date:a.date,note:a.note,...Object.fromEntries(segments.map(p=>[p,"Sem vistoria"]))});
      checkTime(a);ids.add(a.id);
    }
    return data;
  }
  function findings(data) {
    validate(data);
    const items=new Map(),timeline=[];
    for(const r of data.records)for(const part of segments)if(r[part]==="Barreira observada")
      timeline.push({point:r.point,date:r.date,part,type:"observed",note:r.note,recordedAt:r.recordedAt});
    timeline.push(...data.actions);
    timeline.sort((a,b)=>a.date.localeCompare(b.date) || (a.recordedAt||"").localeCompare(b.recordedAt||""));
    for(const a of timeline){
      const id=key(a.point,a.part), item=items.get(id);
      if(a.type==="observed"){
        if(!item)items.set(id,{point:a.point,part:a.part,state:"Aberta",last:a.date,events:[a]});
        else {item.state="Aberta";item.last=a.date;item.events.push(a);}
        continue;
      }
      if(!item || (a.type==="correction"?item.state!=="Aberta":item.state!=="A verificar"))
        throw Error("Ação sem etapa anterior compatível em "+a.point+" · "+a.part+" · "+a.date);
      item.state={correction:"A verificar",verified:"Verificada",reopened:"Aberta"}[a.type];
      item.last=a.date; item.events.push(a);
    }
    return [...items.values()].sort((a,b)=>["Aberta","A verificar","Verificada"].indexOf(a.state)-["Aberta","A verificar","Verificada"].indexOf(b.state)||a.point.localeCompare(b.point));
  }
  function merge(current,backup){
    const incoming=validate(backup);
    const records=model.mergeHistory(current.records,incoming.records);
    const byId=new Map(current.actions.map(a=>[a.id,a]));
    for(const a of incoming.actions){
      const old=byId.get(a.id);
      if(old && ["point","part","type","note","date"].some(k=>a[k]!==old[k]))throw Error("Conflito no ID de uma ação.");
      if(!old)byId.set(a.id,a);
    }
    const result={schemaVersion:2,records,actions:[...byId.values()]};
    findings(result);return result;
  }
  function geojson(records) {
    const features = [];
    for (const visit of records) {
      model.inspect(visit);
      if (!visit.coordinates) continue;
      const properties = {ponto:visit.point, data:visit.date};
      for (const segment of segments) properties[segment] = visit[segment];
      features.push({type:"Feature",geometry:{type:"Point",coordinates:visit.coordinates},properties});
    }
    return {type:"FeatureCollection",features};
  }
  return {validate,findings,merge,identity,geojson};
})();
if(typeof module!=="undefined")module.exports=Field;
