const test=require("node:test"), assert=require("node:assert/strict"),F=require("./field");
const r={point:"Praça",date:"2026-10-01",calçada:"Barreira observada",travessia:"Sem vistoria",embarque:"Livre na vistoria",note:"Piso danificado"};
const a={point:"Praça",date:"2026-10-03",part:"calçada",type:"correction",id:"a",note:"Piso reparado"};
const v={...a,id:"v",type:"verified",date:"2026-10-04",note:"Retorno ao ponto"};
const data={schemaVersion:2,records:[r,{...r,date:"2026-10-02",calçada:"Livre na vistoria"}],actions:[]};
test("vistoria livre não encerra a barreira",()=>assert.equal(F.findings(data)[0].state,"Aberta"));
test("correção e verificação precisam de etapas válidas",()=>{
 assert.equal(F.findings({...data,actions:[a]})[0].state,"A verificar");
 assert.equal(F.findings({...data,actions:[a,v]})[0].state,"Verificada");
 assert.throws(()=>F.findings({...data,actions:[v]}));
});
test("observação posterior reabre e backup repetido é idempotente",()=>{
 const later={...r,date:v.date,recordedAt:"2026-10-04T13:00:00.000Z"};
 const updated=F.merge({...data,actions:[a,v]},[later]);
 assert.equal(F.findings(updated)[0].state,"Aberta");
 assert.deepEqual(F.merge(updated,updated),updated);
 assert.throws(()=>F.merge(updated,{...data,actions:[{...a,note:"outro"}]}));
});
test("CSV neutraliza fórmulas ASCII, controles e variantes Unicode",()=>{
 assert.equal(F.csvCell("=1+1"),'"\'=1+1"');
 assert.equal(F.csvCell("\tSOMA(A1:A2)"),'"\'\tSOMA(A1:A2)"');
 assert.equal(F.csvCell("＋1"),'"\'＋1"');
 assert.equal(F.csvCell('Ponto "A"'),'"Ponto ""A"""');
});
