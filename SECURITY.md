# Política de segurança

## Versões cobertas

Só a versão da branch `main`, publicada na [demonstração](https://ykauttiz.github.io/ultimos-50-metros/), recebe correções. Últimos 50 Metros é um projeto pessoal mantido por uma pessoa, e não há prazo garantido de resposta.

## Como relatar

1. Se a aba **Security** do repositório tiver o botão **Report a vulnerability**, use-o. O relato fica privado.
2. Se o botão não estiver disponível, abra uma [issue](https://github.com/ykauttiz/ultimos-50-metros/issues/new/choose) com o título "Segurança: resumo", descrevendo o **impacto** e sem o passo a passo de exploração nem dados reais. O mantenedor combina um canal privado antes de qualquer detalhe técnico.

Nunca publique tokens, senhas ou dados de terceiros em um relato.

## O que interessa

- Foto ou backup que preserve metadados pessoais do arquivo original.
- Localização gravada sem a ação do usuário.
- Exportações (CSV, GeoJSON, ficha impressa) que incluam campos que o README diz omitir: foto, observações livres ou coordenadas.

## Fora de escopo

- Pedidos de recurso e erros de cálculo sem impacto de segurança: use [Relatar um problema](https://github.com/ykauttiz/ultimos-50-metros/issues/new/choose).
- Falhas em serviços de terceiros (GitHub, Discord, plataformas de delivery): relate ao serviço.

## O que o código faz com os dados

O código do aplicativo não usa telemetria nem scripts de terceiros e não envia os dados do usuário a um servidor. A hospedagem na GitHub Pages registra acessos como qualquer site estático. Ausência de alertas não prova ausência de falhas.
