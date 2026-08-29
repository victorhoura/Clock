# Pulse — Produtividade em Equipe

Aplicativo web para controle de produtividade de equipes pequenas: dashboard geral, bater ponto (entrada/saída) e gerenciamento de atividades e membros. Cadastro de usuários é manual (sem login Google/OAuth).

## Funcionalidades

- **Dashboard**: calendário mensal da equipe, gráficos de horas e atividades concluídas por pessoa, ranking de produtividade, status das atividades.
- **Bater Ponto**: seleção do usuário cadastrado, registro de entrada/saída, histórico de registros por dia.
- **Atividades**: quadro com atividades pendentes, em andamento e concluídas, atribuídas a membros da equipe.
- **Usuários**: cadastro, edição e remoção manual de membros da equipe.
- **Tema claro/escuro** com alternância persistida.

Os dados são armazenados localmente no navegador (`localStorage`) — não há backend nem autenticação externa.

## Rodando localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
```

## Stack

React + TypeScript + Vite + Tailwind CSS v4 + Recharts.
