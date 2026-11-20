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
test("restauração cumulativa, repetível e com desempate local",()=>{
  const {mergeHistory} = require("./core");
  const local = {...entry, note:"nova observação"};
  const merged = mergeHistory([local],[entry,entry]);
  assert.deepEqual(mergeHistory(merged,[entry,local]),merged);
  assert.equal(queue(merged)[0].note,local.note);
  assert.throws(()=>mergeHistory([local],[entry,{date:"inválida"}]));
});
test("histórico mantém as visitas anteriores e a ordem em datas iguais",()=>{
  const {history} = require("./core");
  const records = [entry,{...entry,date:"2026-12-10",note:"segunda"},{...entry,date:"2026-12-10",note:"terceira"}];
  assert.deepEqual(history(records).map(r=>r.note),["terceira","segunda",entry.note]);
  assert.equal(records[0],entry);
});
