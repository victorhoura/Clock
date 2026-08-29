# Pulse — Produtividade em Equipe

Aplicativo web para controle de produtividade de equipes pequenas: dashboard geral, bater ponto (entrada/saída) e gerenciamento de atividades e membros. Cadastro de usuários é manual (sem login Google/OAuth).

## Funcionalidades

- **Dashboard**: calendário mensal da equipe, gráficos de horas e atividades concluídas por pessoa, ranking de produtividade, status das atividades.
- **Bater Ponto**: seleção do usuário cadastrado, registro de entrada/saída, histórico de registros por dia.
- **Atividades**: quadro com atividades pendentes, em andamento e concluídas, atribuídas a membros da equipe.
- **Usuários**: cadastro, edição e remoção manual de membros da equipe.
- **Tema claro/escuro** com alternância persistida.

Os dados ficam em um banco Supabase (Postgres) compartilhado por toda a equipe, com sincronização em tempo real entre dispositivos. Não há autenticação de conta (Google ou outra) — o cadastro dos membros é manual e cada pessoa apenas seleciona o próprio nome ao usar o app.

## Configuração do Supabase

1. Copie `.env.example` para `.env`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do seu projeto Supabase (Project Settings → API).
3. O schema (tabelas `team_members`, `time_entries`, `activities`) já está criado no projeto Supabase vinculado a este app.

## Rodando localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
```

## Deploy

Implantado na Vercel (projeto `pulse-produtividade`), com deploy automático a cada push na branch de produção do repositório. As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são configuradas no Vercel Project Settings → Environment Variables.

## Stack

React + TypeScript + Vite + Tailwind CSS v4 + Recharts + Supabase (Postgres + Realtime), hospedado na Vercel.
