# 💰 Finance Pro Dashboard

Um sistema completo de gestão financeira pessoal desenvolvido com foco em performance e usabilidade. Permite o controle de entradas, saídas e o acompanhamento de investimentos com filtros mensais dinâmicos.

## 🚀 Tecnologias
- **Framework:** [Next.js 14](https://nextjs.org/)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS
- **Banco de Dados:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Gráficos:** Recharts
- **Deploy:** Vercel

## ✨ Funcionalidades
- **Gestão de Investimentos:** Categoria específica para aportes, separando gastos de patrimônio.
- **Filtro Mensal:** Dashboard inteligente que recalcula saldos e gráficos com base no mês selecionado.
- **Gráficos Dinâmicos:** Visualização moderna em área com gradiente para acompanhamento do fluxo de caixa.
- **Segurança (RLS):** Implementação de Row Level Security no banco de dados.

## 🛠️ Como rodar o projeto
1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente (`.env.local`) com suas chaves do Supabase.
4. Rode o projeto: `npm run dev`