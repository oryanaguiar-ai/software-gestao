'use client'

import { useEffect, useState } from "react"
// Ajustado para caminho relativo, evitando erro de alias na Vercel
import { supabase } from "../lib/supabaseClient" 
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts"

interface Transaction {
  id: number
  description: string
  amount: number
  type: "income" | "expense" | "investment"
  category: string
  created_at: string
}

export default function Dashboard() {
  const [transacoes, setTransacoes] = useState<Transaction[]>([])
  const [valor, setValor] = useState("")
  const [descricao, setDescricao] = useState("")
  const [tipo, setTipo] = useState<"income" | "expense" | "investment">("income")
  
  const dataAtual = new Date()
  const mesPadrao = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`
  const [mesFiltro, setMesFiltro] = useState(mesPadrao)

  async function carregar() {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Erro ao carregar:", error.message)
      return
    }
    if (data) setTransacoes(data)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function adicionarTransacao() {
    if (!valor || isNaN(Number(valor))) return

    const { error } = await supabase.from("transactions").insert([
      {
        description: descricao || (tipo === "investment" ? "Novo Investimento" : "Transação Manual"),
        amount: Number(valor),
        type: tipo,
        category: tipo === "investment" ? "Investimento" : "Geral",
        status: "pago",
        created_at: new Date().toISOString()
      }
    ])

    if (error) {
      alert("Erro ao salvar! Verifique as permissões do banco.")
      return console.error(error.message)
    }

    setValor("")
    setDescricao("")
    carregar()
  }

  async function excluirTransacao(id: number) {
    if (!window.confirm("Deseja realmente excluir?")) return
    await supabase.from("transactions").delete().eq("id", id)
    carregar()
  }

  const obterResumoMes = (mesAno: string) => {
    const filtradas = transacoes.filter(t => {
      const d = new Date(t.created_at)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === mesAno
    })
    const ent = filtradas.filter(t => t.type === "income").reduce((acc, t) => acc + Number(t.amount), 0)
    const sai = filtradas.filter(t => t.type === "expense").reduce((acc, t) => acc + Number(t.amount), 0)
    const inv = filtradas.filter(t => t.type === "investment").reduce((acc, t) => acc + Number(t.amount), 0)
    return { ent, sai, inv, total: ent - sai - inv }
  }

  const atual = obterResumoMes(mesFiltro)

  const transacoesDoMes = transacoes.filter(t => {
    const d = new Date(t.created_at)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === mesFiltro
  })

  const dadosGrafico = transacoesDoMes.map(t => ({
    dia: new Date(t.created_at).getDate().toString().padStart(2, '0'),
    valor: t.type === 'income' ? Number(t.amount) : -Number(t.amount)
  }))

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6 md:p-10 font-sans">
      
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Finance <span className="text-purple-500">Pro</span></h1>
          <p className="text-zinc-500 text-sm italic">Gestão de {new Date(mesFiltro + "-02").toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        </div>
        <input 
          type="month" 
          value={mesFiltro}
          onChange={(e) => setMesFiltro(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 p-2.5 px-4 rounded-xl outline-none focus:border-purple-500 text-white cursor-pointer"
        />
      </header>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
          <p className="text-zinc-500 text-xs uppercase font-bold mb-1 tracking-wider">Investido</p>
          <h2 className="text-2xl font-black text-blue-400">R$ {atual.inv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
          <p className="text-zinc-500 text-xs uppercase font-bold mb-1 tracking-wider">Entradas</p>
          <h2 className="text-2xl font-black text-emerald-400">R$ {atual.ent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
          <p className="text-zinc-500 text-xs uppercase font-bold mb-1 tracking-wider">Saídas</p>
          <h2 className="text-2xl font-black text-rose-400">R$ {atual.sai.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-purple-600/10 border border-purple-500/20 p-6 rounded-2xl">
          <p className="text-purple-400 text-xs uppercase font-bold mb-1 tracking-wider">Saldo Livre</p>
          <h2 className="text-2xl font-black text-purple-400">R$ {atual.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
        </div>
      </div>

      {/* GRÁFICO CORRIGIDO */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl mb-8 shadow-xl">
        <div className="height: 350px; w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dadosGrafico}>
              <defs>
                <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
              <XAxis dataKey="dia" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                // CORREÇÃO DO ERRO TS(2322): Usando value: any para aceitar a formatação do Recharts
                formatter={(value: any) => `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              />
              <Area type="monotone" dataKey="valor" stroke="#a855f7" strokeWidth={3} fill="url(#colorValor)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FORMULÁRIO */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">Descrição</label>
            <input 
              type="text" 
              placeholder="Ex: Aluguel..." 
              value={descricao} 
              onChange={(e) => setDescricao(e.target.value)}
              className="bg-zinc-800 border-none p-3 rounded-xl focus:ring-2 ring-purple-500 text-sm outline-none text-white"
            />
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">Valor</label>
            <input 
              type="number" 
              placeholder="0,00" 
              value={valor} 
              onChange={(e) => setValor(e.target.value)}
              className="bg-zinc-800 border-none p-3 rounded-xl focus:ring-2 ring-purple-500 text-sm outline-none text-white"
            />
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">Tipo</label>
            <select 
              value={tipo} 
              onChange={(e) => setTipo(e.target.value as any)}
              className="bg-zinc-800 border-none p-3 rounded-xl focus:ring-2 ring-purple-500 text-sm outline-none cursor-pointer text-white"
            >
              <option value="income">Entrada (+)</option>
              <option value="expense">Saída (-)</option>
              <option value="investment">Investimento (⬆)</option>
            </select>
          </div>
          <button 
            onClick={adicionarTransacao}
            className="bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold transition active:scale-95 shadow-lg shadow-purple-600/10"
          >
            Lançar
          </button>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-zinc-800/50">
              {transacoesDoMes.map(t => (
                <tr key={t.id} className="hover:bg-zinc-800/20 transition group">
                  <td className="px-6 py-4">
                    <p className="font-medium text-zinc-200">{t.description}</p>
                    <p className="text-[10px] text-zinc-500">{new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-emerald-500' : t.type === 'investment' ? 'text-blue-400' : 'text-rose-500'}`}>
                    R$ {Number(t.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => excluirTransacao(t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-500 transition-all">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}