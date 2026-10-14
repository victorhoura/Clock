# Gestão Plantão Digital — Produtividade em Equipe

Aplicativo web para controle de produtividade de equipes pequenas: dashboard geral, bater ponto (entrada/saída) e gerenciamento de atividades e membros. Cadastro de usuários é manual (sem login Google/OAuth).

## Funcionalidades

- **Dashboard**: calendário mensal da equipe, gráficos de horas e atividades concluídas por pessoa, ranking de produtividade, status das atividades.
- **Bater Ponto**: seleção do usuário cadastrado, registro de entrada/saída, histórico de registros por dia.
- **Atividades**: quadro com atividades pendentes, em andamento e concluídas, atribuídas a membros da equipe.
- **Financeiro**: faturamento, custos fixos e variáveis, lucro e margem (mensal e anual), contas a pagar e a receber com vencimento, custos fixos recorrentes que geram as contas do mês automaticamente, DRE anual e exportação CSV.
- **Usuários**: cadastro, edição e remoção manual de membros da equipe.
- **Tema claro/escuro** com alternância persistida.

Os dados ficam no Firebase (Cloud Firestore), compartilhados por toda a equipe, com sincronização em tempo real entre dispositivos. Não há autenticação de conta (Google ou outra) — o cadastro dos membros é manual e cada pessoa apenas seleciona o próprio nome ao usar o app.

## Configuração do Firebase

1. Em [console.firebase.google.com](https://console.firebase.google.com), crie um projeto (o Google Analytics pode ficar desligado).
2. Em **Build → Firestore Database**, crie o banco em modo de produção (região `southamerica-east1`, São Paulo).
3. Em **Firestore → Regras**, cole o conteúdo de `firestore.rules` e publique.
4. Em **Configurações do projeto → Seus apps**, registre um app Web e copie a configuração.
5. Copie `.env.example` para `.env` e preencha `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` e `VITE_FIREBASE_APP_ID`.

As coleções (`team_members`, `time_entries`, `activities`, `finance_transactions`, `finance_recurring`) são criadas automaticamente no primeiro uso. As fotos de perfil são reduzidas para 256px e guardadas no próprio documento do membro, sem precisar do Firebase Storage.

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

Implantado na Vercel (projeto `pulse-produtividade`), com deploy automático a cada push na branch de produção do repositório. As variáveis `VITE_FIREBASE_*` são configuradas no Vercel Project Settings → Environment Variables.

## Stack

React + TypeScript + Vite + Tailwind CSS v4 + Recharts + Firebase (Cloud Firestore), hospedado na Vercel.
