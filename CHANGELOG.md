# Changelog

## 2026-11-21

No ponto de ônibus, abra a localização opcional e selecione **Usar posição do aparelho**. Revise latitude, longitude e precisão antes de salvar. A entrada manual também funciona quando a permissão é negada. O CI disponibiliza capturas em duas larguras.

**Imprimir seleção** gera uma ficha com ponto, data, prioridade e condição dos três trechos. A ficha omite as coordenadas e as observações livres.

Na área **Vistorias**, selecione a prioridade para ver barreiras, vistorias incompletas ou completas. Os contadores acompanham o ponto pesquisado e a exibição por fila ou histórico. O GeoJSON respeita essa seleção. O histórico e a fila são preparados quando os registros mudam e reutilizados durante a busca.

Em **Vistorias**, selecione um ponto para comparar as duas observações mais recentes. O caderno mostra as datas e o que mudou em calçada, travessia e embarque, inclusive quando uma observação continua igual.

- Caderno de campo com navegação por seção e áreas distintas para registrar e acompanhar vistorias.

Preparação offline para reabrir o caderno em campo, com teste de recarga sem rede.

Na vistoria, abra **Localização opcional do ponto** e informe latitude e longitude. O botão **Exportar vistorias da seleção em GeoJSON** inclui as vistorias com coordenadas da fila ou histórico filtrado por ponto. O arquivo traz ponto, data e condições dos três trechos. Observações livres e ações permanecem no backup completo.

Ocorrências por trecho com correção e verificação em campo, pesquisa, exemplo isolado e restauração com prévia. Backups antigos de vistorias continuam aceitos.

## 2026-11-20 · Histórico de campo

Use a seleção de exibição para alternar entre a fila atual e todas as visitas por data. A tabela identifica o estado de cada trecho separadamente, inclusive quando ainda falta vistoriá-lo.

## 2026-11-20 · Restaurar um histórico

Em **Restaurar histórico JSON**, selecione um backup exportado pelo aplicativo. A importação valida o arquivo inteiro antes de salvar. Vistorias idênticas entram uma única vez. Se houver observações diferentes do mesmo ponto no mesmo dia, ambas ficam no histórico e a fila prioriza a observação local.
