# Últimos 50 Metros

[Experimentar no navegador](https://ykauttiz.github.io/ultimos-50-metros/)

Uma vistoria pode encontrar uma barreira na calçada antes mesmo de chegar ao ponto. Este caderno registra separadamente calçada, travessia e embarque. O botão **Ver exemplo fictício** mostra uma esquina com a calçada interrompida.

Baixe o projeto e abra **index.html**. Informe um identificador estável para o ponto (inclua o sentido), a data e o que observou. Use **Sem vistoria** se um trecho ficou por verificar. A fila destaca barreiras e usa a observação mais recente de cada ponto. Em empate de data, vale a última salva.

Os registros são locais a este navegador e endereço. Exporte o histórico em JSON antes de limpar seus dados. A fila serve para planejar novas vistorias; uma observação pontual não certifica a acessibilidade de uma rota.

`core.js` valida os registros e organiza a fila. `app.js` controla o formulário e a persistência. Para testar, use Node 20+ e execute `node --test`.

## Restaurar um histórico

Em **Restaurar histórico JSON**, selecione um backup exportado pelo aplicativo. A importação valida o arquivo inteiro antes de salvar. Vistorias idênticas entram uma única vez. Se houver observações diferentes do mesmo ponto no mesmo dia, ambas ficam no histórico e a fila prioriza a observação local.

## Histórico de campo

Use a seleção de exibição para alternar entre a fila atual e todas as visitas por data. A tabela identifica o estado de cada trecho separadamente, inclusive quando ainda falta vistoriá-lo.

## Acompanhar uma ocorrência

Identifique o ponto e o sentido no campo de nome. Cada trecho com barreira abre uma ocorrência própria. No cartão da ocorrência, registre a data e a descrição da correção. Uma segunda etapa permite confirmar a correção em campo ou registrar que a barreira persiste. Uma vistoria livre ou incompleta não encerra a ocorrência. Uma barreira observada novamente reabre o acompanhamento. O histórico permanece no navegador e o exemplo fictício pode ser editado separadamente.

O backup versão 2 contém vistorias e ações. A importação também reconhece a lista de vistorias do formato anterior, mostra quantas entradas serão acrescentadas e só grava ao confirmar. Um arquivo inválido ou uma ação conflitante interrompe a restauração. Use nomes consistentes para identificar cada ponto e sentido. Os registros documentam visitas, sem certificar a acessibilidade de uma rota.
