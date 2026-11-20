const test = require("node:test"), assert = require("node:assert/strict");
const {queue,inspect} = require("./core");
const entry = {point:"Centro",date:"2026-11-01",calçada:"Sem vistoria",embarque:"Livre na vistoria",travessia:"Livre na vistoria",note:""};
test("campo desconhecido não é trajeto livre",()=>assert.equal(inspect(entry),"Completar vistoria"));
test("revisão mais recente prevalece mesmo fora de ordem",()=>{
  const newer = {...entry,point:"CENTRO",date:"2026-11-02",calçada:"Barreira observada"};
  assert.deepEqual(queue([newer,entry]).map(r=>r.status),["Revisar barreira"]);
});
test("data impossível e estado desconhecido",()=>{
  assert.throws(()=>inspect({...entry,date:"2026-02-31"}));
  assert.throws(()=>inspect({...entry,calçada:"talvez"}));
});
