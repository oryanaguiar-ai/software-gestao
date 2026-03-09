'use client'

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient" 
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from "recharts"
import { Trash2 } from "lucide-react"

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
      .order("created_at", { ascending: false })

    if (error) return console.error(error.message)
    if (data) setTransacoes(data)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function excluirTransacao(id: number) {
    if (!window.confirm("Deseja excluir este lançamento?")) return
    const { error } = await supabase.from("transactions").delete().eq("id", id)
    if (error) alert("Erro ao excluir!")
    else carregar()
  }

  async function adicionarTransacao() {
    if (!valor || isNaN(Number(valor))) return

    const { error } = await supabase.from("transactions").insert([
      {
        description: descricao || "Transação",
        amount: Number(valor),
        type: tipo,
        category: "Geral"
      }
    ])

    if (error) {
      console.error(error)
      alert("Erro ao salvar no banco de dados.")
      return
    }

    setValor("")
    setDescricao("")
    carregar()
  }

  const transacoesDoMes = transacoes.filter(t => {
    const d = new Date(t.created_at)
    const mesAno = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return mesAno === mesFiltro
  })

  const ent = transacoesDoMes.filter(t => t.type === "income").reduce((acc, t) => acc + Number(t.amount), 0)
  const sai = transacoesDoMes.filter(t => t.type === "expense").reduce((acc, t) => acc + Number(t.amount), 0)
  const inv = transacoesDoMes.filter(t => t.type === "investment").reduce((acc, t) => acc + Number(t.amount), 0)
  const resumo = { ent, sai, inv, total: ent - sai - inv }

  const dadosPizza = [
    { name: 'Saldo', value: resumo.total > 0 ? resumo.total : 0, color: '#a855f7' },
    { name: 'Gastos', value: resumo.sai, color: '#fb7185' },
    { name: 'Investimento', value: resumo.inv, color: '#60a5fa' },
  ].filter(d => d.value > 0)

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6 md:p-10 font-sans">
      <header className="mb-10 flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Finance <span className="text-purple-500">Pro</span></h1>
        <input 
          type="month" 
          value={mesFiltro}
          onChange={(e) => setMesFiltro(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 p-2 rounded-xl outline-none"
        />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl text-center">
          <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Entradas</p>
          <h2 className="text-2xl font-black text-emerald-400 font-mono">R$ {resumo.ent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl text-center">
          <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Saídas</p>
          <h2 className="text-2xl font-black text-rose-400 font-mono">R$ {resumo.sai.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl text-center">
          <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Investido</p>
          <h2 className="text-2xl font-black text-blue-400 font-mono">R$ {resumo.inv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-purple-600/10 border border-purple-500/20 p-6 rounded-2xl text-center">
          <p className="text-purple-400 text-xs font-bold uppercase mb-1">Saldo Livre</p>
          <h2 className="text-2xl font-black text-purple-400 font-mono">R$ {resumo.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2">Descrição</label>
            <input type="text" placeholder="Ex: Salário" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="bg-zinc-800 p-3 rounded-xl text-sm outline-none border-none focus:ring-2 ring-purple-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2">Valor</label>
            <input type="number" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} className="bg-zinc-800 p-3 rounded-xl text-sm outline-none border-none focus:ring-2 ring-purple-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="bg-zinc-800 p-3 rounded-xl text-sm outline-none border-none focus:ring-2 ring-purple-500">
              <option value="income">Receita (+)</option>
              <option value="expense">Despesa (-)</option>
              <option value="investment">Investimento (⬆)</option>
            </select>
          </div>
          <button onClick={adicionarTransacao} className="bg-purple-600 hover:bg-purple-500 h-[45px] rounded-xl font-bold transition active:scale-95 text-white">Lançar</button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-zinc-800/30 text-[10px] uppercase text-zinc-500 font-black">
              <th className="px-6 py-3">Descrição</th>
              <th className="px-6 py-3 text-right">Valor</th>
              <th className="px-6 py-3 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {transacoesDoMes.map(t => (
              <tr key={t.id} className="hover:bg-zinc-800/20 transition group">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-zinc-300">{t.description}</div>
                  <div className="text-[10px] text-zinc-600">{new Date(t.created_at).toLocaleDateString('pt-BR')}</div>
                </td>
                <td className={`px-6 py-4 text-right font-bold font-mono ${t.type === 'income' ? 'text-emerald-500' : t.type === 'investment' ? 'text-blue-400' : 'text-rose-500'}`}>
                  R$ {Number(t.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => excluirTransacao(t.id)} className="text-zinc-600 hover:text-rose-500 p-2"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}