'use client'

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient" 
import { Trash2, CheckCircle2, Target, Plus, Pencil, X, Eye, EyeOff, Download } from "lucide-react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from "recharts"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

interface Transaction {
  id: number
  description: string
  amount: number
  type: "income" | "expense" | "investment"
  category: string
  created_at: string
}

interface Conta {
  id: number
  titulo: string
  categoria: string
  valor: number
  dia_vencimento: number
  parcelas_totais: number
  parcelas_pagas: number
  ativa: boolean
}

interface Meta {
  id: number
  titulo: string
  valor_objetivo: number
  valor_atual: number
}

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false)

  // --- MODO PRIVACIDADE ---
  const [ocultarValores, setOcultarValores] = useState(false)
  const classeBlur = ocultarValores ? "blur-md opacity-40 select-none" : "transition-all duration-300"

  // --- ESTADOS: DASHBOARD ---
  const [transacoes, setTransacoes] = useState<Transaction[]>([])
  const [valor, setValor] = useState("")
  const [descricao, setDescricao] = useState("")
  const [tipo, setTipo] = useState<"income" | "expense" | "investment">("income")
  const [dataTransacao, setDataTransacao] = useState("") // <-- NOVO: Estado para a data
  const [metaSelecionada, setMetaSelecionada] = useState("")
  const [editandoTransacao, setEditandoTransacao] = useState<number | null>(null)

  // --- ESTADOS: CONTAS ---
  const [contas, setContas] = useState<Conta[]>([])
  const [tituloConta, setTituloConta] = useState("")
  const [categoriaConta, setCategoriaConta] = useState("")
  const [valorConta, setValorConta] = useState("")
  const [diaVencimento, setDiaVencimento] = useState("")
  const [parcelasTotais, setParcelasTotais] = useState("0")
  const [editandoConta, setEditandoConta] = useState<number | null>(null)

  // --- ESTADOS: METAS ---
  const [metas, setMetas] = useState<Meta[]>([])
  const [tituloMeta, setTituloMeta] = useState("")
  const [valorObjetivo, setValorObjetivo] = useState("")
  const [valorAporte, setValorAporte] = useState<{ [key: number]: string }>({})
  const [editandoMeta, setEditandoMeta] = useState<number | null>(null)

  const [abaAtiva, setAbaAtiva] = useState<"dashboard" | "contas" | "metas">("dashboard")
  
  const dataAtual = new Date()
  const mesPadrao = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`
  const [mesFiltro, setMesFiltro] = useState(mesPadrao)

  // --- FUNÇÕES DE MÁSCARA ---
  const formatarMoedaInput = (valorDigitado: string) => {
    const apenasNumeros = valorDigitado.replace(/\D/g, "")
    if (!apenasNumeros) return ""
    const numero = Number(apenasNumeros) / 100
    return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  const converterParaNumero = (valorFormatado: string) => {
    return Number(valorFormatado.replace(/\D/g, "")) / 100
  }

  // --- EXPORTAÇÃO DE PDF ---
  async function exportarPDF() {
    const elemento = document.getElementById("relatorio-dashboard")
    if (!elemento) return

    try {
      const canvas = await html2canvas(elemento, { 
        scale: 2, 
        backgroundColor: "#09090b" 
      })
      
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight)
      pdf.save(`Relatorio_FinancePro_${mesFiltro}.pdf`)
    } catch (erro) {
      console.error("Erro ao gerar PDF:", erro)
      alert("Ocorreu um erro ao gerar o relatório em PDF.")
    }
  }

  // --- CARREGAMENTO ---
  async function carregar() {
    const { data, error } = await supabase.from("transactions").select("*").order("created_at", { ascending: false })
    if (!error && data) setTransacoes(data)
  }
  async function carregarContas() {
    const { data, error } = await supabase.from("contas").select("*").order("dia_vencimento", { ascending: true })
    if (!error && data) setContas(data)
  }
  async function carregarMetas() {
    const { data, error } = await supabase.from("metas").select("*").order("created_at", { ascending: false })
    if (!error && data) setMetas(data)
  }

  useEffect(() => {
    setIsMounted(true)
    carregar()
    carregarContas()
    carregarMetas()
  }, [])

  // ==========================================
  // FUNÇÕES: DASHBOARD (TRANSAÇÕES)
  // ==========================================
  function prepararEdicaoTransacao(t: Transaction) {
    setDescricao(t.description)
    setValor(formatarMoedaInput((t.amount * 100).toFixed(0)))
    setTipo(t.type)
    
    // Converte a data do banco para preencher o input type="date"
    if (t.created_at) {
      const dataObj = new Date(t.created_at)
      setDataTransacao(dataObj.toISOString().split('T')[0])
    }
    
    setEditandoTransacao(t.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicaoTransacao() {
    setDescricao("")
    setValor("")
    setTipo("income")
    setDataTransacao("") // Limpa a data
    setEditandoTransacao(null)
    setMetaSelecionada("")
  }

  async function salvarTransacao() {
    const valorNumerico = converterParaNumero(valor)
    if (!descricao || valorNumerico <= 0) return

    const isInvestimentoMeta = tipo === "investment" && metaSelecionada !== ""
    const metaDestino = metas.find(m => m.id === Number(metaSelecionada))
    
    // Adicionamos a tipagem any temporária para permitir inserir o created_at dinamicamente
    const payload: any = {
      description: isInvestimentoMeta && !editandoTransacao ? `Investimento: ${metaDestino?.titulo}` : descricao, 
      amount: valorNumerico, 
      type: tipo, 
      category: isInvestimentoMeta ? "Metas" : "Geral"
    }

    // Se o utilizador escolheu uma data, anexamos ao envio
    if (dataTransacao) {
      payload.created_at = new Date(`${dataTransacao}T12:00:00`).toISOString()
    }

    if (editandoTransacao) {
      const { error } = await supabase.from("transactions").update(payload).eq("id", editandoTransacao)
      if (!error) cancelarEdicaoTransacao()
    } else {
      const { error } = await supabase.from("transactions").insert([payload])
      if (!error) {
        if (isInvestimentoMeta && metaDestino) {
          await supabase.from("metas").update({ valor_atual: metaDestino.valor_atual + valorNumerico }).eq("id", metaDestino.id)
          carregarMetas() 
        }
        cancelarEdicaoTransacao()
      }
    }
    carregar()
  }

  async function excluirTransacao(id: number) {
    if (!window.confirm("Deseja excluir este lançamento?")) return
    await supabase.from("transactions").delete().eq("id", id)
    carregar()
  }

  // ==========================================
  // FUNÇÕES: CONTAS
  // ==========================================
  function prepararEdicaoConta(c: Conta) {
    setTituloConta(c.titulo)
    setCategoriaConta(c.categoria)
    setDiaVencimento(String(c.dia_vencimento))
    setValorConta(formatarMoedaInput((c.valor * 100).toFixed(0)))
    setParcelasTotais(String(c.parcelas_totais))
    setEditandoConta(c.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicaoConta() {
    setTituloConta("")
    setCategoriaConta("")
    setDiaVencimento("")
    setValorConta("")
    setParcelasTotais("0")
    setEditandoConta(null)
  }

  async function salvarConta() {
    const valorNumerico = converterParaNumero(valorConta)
    if (!tituloConta || valorNumerico <= 0 || !diaVencimento || !categoriaConta) return
    
    const payload = {
      titulo: tituloConta, categoria: categoriaConta, valor: valorNumerico,
      dia_vencimento: Number(diaVencimento), parcelas_totais: Number(parcelasTotais) || 0
    }

    if (editandoConta) {
      await supabase.from("contas").update(payload).eq("id", editandoConta)
      cancelarEdicaoConta()
    } else {
      await supabase.from("contas").insert([{ ...payload, parcelas_pagas: 0, ativa: true }])
      cancelarEdicaoConta()
    }
    carregarContas()
  }

  async function registrarPagamento(conta: Conta) {
    if (!window.confirm(`Lançar pagamento de R$ ${conta.valor} para "${conta.titulo}"?`)) return
    await supabase.from("transactions").insert([{ description: `Pagamento: ${conta.titulo}`, amount: conta.valor, type: "expense", category: conta.categoria }])
    if (conta.parcelas_totais > 0) {
      const novasPagas = conta.parcelas_pagas + 1
      const continuaAtiva = novasPagas < conta.parcelas_totais
      await supabase.from("contas").update({ parcelas_pagas: novasPagas, ativa: continuaAtiva }).eq("id", conta.id)
    }
    carregar(); carregarContas()
  }

  async function excluirConta(id: number) {
    if (!window.confirm("Excluir esta conta da lista?")) return
    await supabase.from("contas").delete().eq("id", id)
    carregarContas()
  }

  // ==========================================
  // FUNÇÕES: METAS
  // ==========================================
  function prepararEdicaoMeta(m: Meta) {
    setTituloMeta(m.titulo)
    setValorObjetivo(formatarMoedaInput((m.valor_objetivo * 100).toFixed(0)))
    setEditandoMeta(m.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicaoMeta() {
    setTituloMeta("")
    setValorObjetivo("")
    setEditandoMeta(null)
  }

  async function salvarMeta() {
    const valorNumerico = converterParaNumero(valorObjetivo)
    if (!tituloMeta || valorNumerico <= 0) return
    
    if (editandoMeta) {
      await supabase.from("metas").update({ titulo: tituloMeta, valor_objetivo: valorNumerico }).eq("id", editandoMeta)
      cancelarEdicaoMeta()
    } else {
      await supabase.from("metas").insert([{ titulo: tituloMeta, valor_objetivo: valorNumerico, valor_atual: 0 }])
      cancelarEdicaoMeta()
    }
    carregarMetas()
  }

  async function excluirMeta(id: number) {
    if (!window.confirm("Deseja excluir esta meta?")) return
    await supabase.from("metas").delete().eq("id", id)
    carregarMetas()
  }

  async function guardarDinheiro(meta: Meta) {
    const quantia = converterParaNumero(valorAporte[meta.id] || "")
    if (!quantia || quantia <= 0) return
    const novoValor = meta.valor_atual + quantia
    const { error } = await supabase.from("metas").update({ valor_atual: novoValor }).eq("id", meta.id)
    if (!error) {
      setValorAporte({ ...valorAporte, [meta.id]: "" })
      carregarMetas()
      if (window.confirm("Registar este valor poupado como saída (Investimento) no Resumo Geral?")) {
        await supabase.from("transactions").insert([{ description: `Poupança: ${meta.titulo}`, amount: quantia, type: "investment", category: "Metas" }])
        carregar()
      }
    }
  }

  if (!isMounted) return <div className="min-h-screen bg-[#09090b]"></div>

  // --- CÁLCULOS ---
  const transacoesDoMes = transacoes.filter(t => {
    const d = new Date(t.created_at)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === mesFiltro
  })

  const ent = transacoesDoMes.filter(t => t.type === "income").reduce((acc, t) => acc + Number(t.amount), 0)
  const sai = transacoesDoMes.filter(t => t.type === "expense").reduce((acc, t) => acc + Number(t.amount), 0)
  const inv = transacoesDoMes.filter(t => t.type === "investment").reduce((acc, t) => acc + Number(t.amount), 0)
  const resumo = { ent, sai, inv, total: ent - sai }

  const dadosPizzaDashboard = [
    { name: 'Saldo Livre', value: resumo.total > 0 ? resumo.total : 0, color: '#a855f7' },
    { name: 'Saídas', value: resumo.sai > 0 ? resumo.sai : 0, color: '#fb7185' },
    { name: 'Investido', value: resumo.inv > 0 ? resumo.inv : 0, color: '#60a5fa' },
  ].filter(d => d.value > 0)

  const categoriasSugeridas = Array.from(new Set(contas.map(c => c.categoria)))
  const contasAtivas = contas.filter(c => c.ativa)
  const totalContas = contasAtivas.reduce((acc, c) => acc + Number(c.valor), 0)
  const comprometimentoRenda = ent > 0 ? (totalContas / ent) * 100 : 0

  const categoriasMap: { [key: string]: number } = {}
  contasAtivas.forEach(c => { categoriasMap[c.categoria] = (categoriasMap[c.categoria] || 0) + Number(c.valor) })
  const coresCategorias = ['#fb7185', '#60a5fa', '#a855f7', '#34d399', '#fbbf24', '#f87171', '#818cf8']
  const dadosPizzaContas = Object.keys(categoriasMap).map((cat, idx) => ({ name: cat, value: categoriasMap[cat], color: coresCategorias[idx % coresCategorias.length] })).filter(d => d.value > 0)

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6 md:p-10 font-sans">
      
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance <span className="text-purple-500">Pro</span></h1>
        </div>
        
        <div className="flex items-center gap-4 md:gap-6">
          <button 
            onClick={() => setOcultarValores(!ocultarValores)} 
            className="text-zinc-500 hover:text-purple-400 transition-colors p-2 rounded-full hover:bg-purple-500/10"
            title={ocultarValores ? "Mostrar Valores" : "Ocultar Valores"}
          >
            {ocultarValores ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>

          {abaAtiva === "dashboard" && (
            <button 
              onClick={exportarPDF} 
              className="text-zinc-500 hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-blue-500/10"
              title="Exportar Relatório Mensal (PDF)"
            >
              <Download size={22} />
            </button>
          )}
          
          {abaAtiva === "dashboard" && (
            <input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="bg-zinc-900 border border-zinc-800 p-2 px-4 rounded-xl outline-none focus:border-purple-500 transition cursor-pointer text-white" />
          )}
        </div>
      </header>

      <nav className="flex gap-8 mb-8 border-b border-zinc-800">
        <button onClick={() => setAbaAtiva("dashboard")} className={`pb-3 font-bold text-sm tracking-wide transition-colors relative ${abaAtiva === "dashboard" ? "text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}>
          Resumo Geral {abaAtiva === "dashboard" && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-purple-500 rounded-t-full shadow-[0_0_8px_rgba(168,85,247,0.8)]" />}
        </button>
        <button onClick={() => setAbaAtiva("contas")} className={`pb-3 font-bold text-sm tracking-wide transition-colors relative ${abaAtiva === "contas" ? "text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}>
          Contas & Parcelas {abaAtiva === "contas" && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-purple-500 rounded-t-full shadow-[0_0_8px_rgba(168,85,247,0.8)]" />}
        </button>
        <button onClick={() => setAbaAtiva("metas")} className={`pb-3 font-bold text-sm tracking-wide transition-colors relative ${abaAtiva === "metas" ? "text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}>
          Metas & Objetivos {abaAtiva === "metas" && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-purple-500 rounded-t-full shadow-[0_0_8px_rgba(168,85,247,0.8)]" />}
        </button>
      </nav>

      {/* ========================================================= */}
      {/* ABA 1: DASHBOARD                                            */}
      {/* ========================================================= */}
      {abaAtiva === "dashboard" && (
        <div id="relatorio-dashboard" className="animate-in fade-in duration-500 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
              <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Entradas</p>
              <h2 className={`text-2xl font-black text-emerald-400 font-mono ${classeBlur}`}>R$ {resumo.ent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
              <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Saídas</p>
              <h2 className={`text-2xl font-black text-rose-400 font-mono ${classeBlur}`}>R$ {resumo.sai.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden">
              <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Investido (Mês)</p>
              <h2 className={`text-2xl font-black text-blue-400 font-mono relative z-10 ${classeBlur}`}>R$ {resumo.inv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
            </div>
            <div className="bg-purple-600/10 border border-purple-500/20 p-6 rounded-2xl">
              <p className="text-purple-400 text-xs font-bold uppercase mb-1">Saldo Livre</p>
              <h2 className={`text-2xl font-black text-purple-400 font-mono ${classeBlur}`}>R$ {resumo.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl mb-8 shadow-xl">
            <h3 className="text-xs font-bold text-zinc-500 uppercase mb-4 tracking-widest text-center">Distribuição do Mês</h3>
            <div className="h-[250px] w-full flex items-center justify-center">
              {dadosPizzaDashboard.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dadosPizzaDashboard} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" 
                      label={({ name, percent }) => ocultarValores ? `${name} ••%` : `${name} ${((percent || 0) * 100).toFixed(0)}%`} 
                      labelLine={false}>
                      {dadosPizzaDashboard.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} 
                      formatter={(value: any) => ocultarValores ? 'R$ •••••' : `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-zinc-600 italic">Cadastre receitas ou despesas para visualizar o gráfico.</div>
              )}
            </div>
          </div>

          {/* FORMULÁRIO DE TRANSAÇÕES */}
          <div data-html2canvas-ignore="true" className={`border rounded-3xl p-6 mb-8 shadow-xl transition-colors ${editandoTransacao ? 'bg-zinc-900/80 border-blue-500/50 shadow-blue-500/10' : 'bg-zinc-900 border-zinc-800'}`}>
            <h3 className="text-xs font-bold text-zinc-500 uppercase mb-4 tracking-widest text-center">
              {editandoTransacao ? "Editar Lançamento" : "Novo Lançamento"}
            </h3>
            <div className="flex flex-col md:flex-row gap-4 items-end w-full">
              <div className="flex flex-col gap-1 flex-1 w-full">
                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2">Data</label>
                <input type="date" value={dataTransacao} onChange={(e) => setDataTransacao(e.target.value)} className="bg-zinc-800 p-3 rounded-xl text-sm outline-none border-none focus:ring-2 ring-purple-500 text-white cursor-pointer" />
              </div>
              <div className="flex flex-col gap-1 flex-1 w-full">
                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2">Descrição</label>
                <input type="text" placeholder="Ex: Salário" value={descricao} onChange={(e) => setDescricao(e.target.value)} disabled={tipo === "investment" && metaSelecionada !== "" && !editandoTransacao} className="bg-zinc-800 p-3 rounded-xl text-sm outline-none border-none focus:ring-2 ring-purple-500 text-white disabled:opacity-50" />
              </div>
              <div className="flex flex-col gap-1 flex-1 w-full">
                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2">Valor</label>
                <input type="text" placeholder="R$ 0,00" value={valor} onChange={(e) => setValor(formatarMoedaInput(e.target.value))} className="bg-zinc-800 p-3 rounded-xl text-sm outline-none border-none focus:ring-2 ring-purple-500 text-white" />
              </div>
              <div className="flex flex-col gap-1 flex-1 w-full">
                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2">Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="bg-zinc-800 p-3 rounded-xl text-sm outline-none border-none focus:ring-2 ring-purple-500 text-white cursor-pointer">
                  <option value="income">Receita (+)</option>
                  <option value="expense">Despesa (-)</option>
                  <option value="investment">Investimento (⬆)</option>
                </select>
              </div>

              {tipo === "investment" && metas.length > 0 && !editandoTransacao && (
                <div className="flex flex-col gap-1 flex-1 w-full animate-in fade-in slide-in-from-bottom-2">
                  <label className="text-[10px] text-blue-400 font-bold uppercase ml-2">Para qual Meta?</label>
                  <select value={metaSelecionada} onChange={(e) => setMetaSelecionada(e.target.value)} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 p-3 rounded-xl text-sm outline-none focus:ring-2 ring-blue-500 cursor-pointer">
                    <option value="">Geral (Nenhuma)</option>
                    {metas.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-2 w-full md:w-auto">
                {editandoTransacao && (
                  <button onClick={cancelarEdicaoTransacao} className="bg-zinc-800 hover:bg-zinc-700 h-[45px] px-4 rounded-xl font-bold transition text-white">
                    <X size={18} />
                  </button>
                )}
                <button onClick={salvarTransacao} className={`h-[45px] px-8 rounded-xl font-bold transition active:scale-95 text-white shadow-lg w-full md:w-auto whitespace-nowrap ${editandoTransacao ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'}`}>
                  {editandoTransacao ? "Atualizar" : "Lançar"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-800/30 text-[10px] uppercase text-zinc-500 font-black">
                  <th className="px-6 py-4">Lançamento</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                  <th data-html2canvas-ignore="true" className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {transacoesDoMes.map(t => (
                  <tr key={t.id} className="hover:bg-zinc-800/20 transition group">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-zinc-300">{t.description}</div>
                      <div className="text-[10px] text-zinc-600">{new Date(t.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold font-mono ${classeBlur} ${t.type === 'income' ? 'text-emerald-500' : t.type === 'investment' ? 'text-blue-400' : 'text-rose-500'}`}>
                      R$ {Number(t.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td data-html2canvas-ignore="true" className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => prepararEdicaoTransacao(t)} className="text-zinc-500 hover:text-blue-400 p-2 rounded-lg hover:bg-blue-500/10 transition-colors"><Pencil size={16} /></button>
                        <button onClick={() => excluirTransacao(t.id)} className="text-zinc-500 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-500/10 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 2: CONTAS E PARCELAS                                    */}
      {/* ========================================================= */}
      {abaAtiva === "contas" && (
        <div className="animate-in fade-in duration-500">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl mb-8 shadow-xl flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 w-full h-[250px]">
              {dadosPizzaContas.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dadosPizzaContas} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" 
                      label={({ name, percent }) => ocultarValores ? `${name} ••%` : `${name} ${((percent || 0) * 100).toFixed(0)}%`} 
                      labelLine={false}>
                      {dadosPizzaContas.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} 
                      formatter={(value: any) => ocultarValores ? 'R$ •••••' : `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-zinc-600 italic">Nenhuma conta ativa para analisar.</div>
              )}
            </div>
            
            <div className="flex-1 w-full">
              <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Comprometimento de Renda</h3>
              <p className="text-sm text-zinc-400 mb-6">Veja como as suas despesas fixas e parcelamentos consomem as suas entradas do mês atual.</p>
              <div className="bg-zinc-800/50 p-4 rounded-2xl mb-4 flex justify-between items-center border border-zinc-700/50">
                <span className="text-zinc-400 text-sm">Total Comprometido</span>
                <span className={`text-rose-400 font-bold font-mono text-lg ${classeBlur}`}>R$ {totalContas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-zinc-800/50 p-4 rounded-2xl flex justify-between items-center border border-zinc-700/50">
                <span className="text-zinc-400 text-sm">Consome das Entradas</span>
                <span className={`font-bold font-mono text-lg ${classeBlur} ${comprometimentoRenda > 70 ? 'text-rose-500' : 'text-emerald-400'}`}>
                  {comprometimentoRenda.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* FORMULÁRIO DE CONTAS */}
          <div className={`border rounded-3xl p-6 mb-8 shadow-xl transition-colors ${editandoConta ? 'bg-zinc-900/80 border-blue-500/50 shadow-blue-500/10' : 'bg-zinc-900 border-zinc-800'}`}>
            <h3 className="text-xs font-bold text-zinc-500 uppercase mb-4 tracking-widest text-center">
              {editandoConta ? "Editar Conta" : "Cadastrar Nova Conta"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
              <div className="flex flex-col gap-1 lg:col-span-2">
                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2">Título</label>
                <input type="text" placeholder="Ex: Financiamento Carro" value={tituloConta} onChange={(e) => setTituloConta(e.target.value)} className="bg-zinc-800 p-3 rounded-xl text-sm outline-none border-none focus:ring-2 ring-purple-500 text-white" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2">Categoria</label>
                <input type="text" list="categorias" placeholder="Ex: Transporte" value={categoriaConta} onChange={(e) => setCategoriaConta(e.target.value)} className="bg-zinc-800 p-3 rounded-xl text-sm outline-none border-none focus:ring-2 ring-purple-500 text-white" />
                <datalist id="categorias">
                  {categoriasSugeridas.map((cat, idx) => <option key={idx} value={cat} />)}
                </datalist>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2">Vencimento</label>
                <input type="number" placeholder="Ex: 10" min="1" max="31" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} className="bg-zinc-800 p-3 rounded-xl text-sm outline-none border-none focus:ring-2 ring-purple-500 text-white" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2">Valor</label>
                <input type="text" placeholder="R$ 0,00" value={valorConta} onChange={(e) => setValorConta(formatarMoedaInput(e.target.value))} className="bg-zinc-800 p-3 rounded-xl text-sm outline-none border-none focus:ring-2 ring-purple-500 text-white" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2">Nº Parcelas (0=Fixa)</label>
                <input type="number" placeholder="0" value={parcelasTotais} onChange={(e) => setParcelasTotais(e.target.value)} className="bg-zinc-800 p-3 rounded-xl text-sm outline-none border-none focus:ring-2 ring-purple-500 text-white" />
              </div>
              
              <div className="flex gap-2 lg:col-span-6 mt-2">
                {editandoConta && (
                  <button onClick={cancelarEdicaoConta} className="bg-zinc-800 hover:bg-zinc-700 h-[45px] px-6 rounded-xl font-bold transition text-white">
                    Cancelar
                  </button>
                )}
                <button onClick={salvarConta} className={`flex-1 h-[45px] rounded-xl font-bold transition active:scale-95 text-white ${editandoConta ? 'bg-blue-600 hover:bg-blue-500' : 'bg-purple-600 hover:bg-purple-500'}`}>
                  {editandoConta ? "Atualizar Conta" : "Programar Conta"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contas.filter(c => c.ativa).map(conta => {
              const saldoDevedor = conta.parcelas_totais > 0 ? (conta.parcelas_totais - conta.parcelas_pagas) * conta.valor : 0;
              return (
                <div key={conta.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative shadow-lg group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-zinc-800 text-zinc-300 text-[10px] px-3 py-1 rounded-full uppercase font-bold tracking-wider">{conta.categoria}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => prepararEdicaoConta(conta)} className="text-zinc-600 hover:text-blue-400"><Pencil size={16} /></button>
                      <button onClick={() => excluirConta(conta.id)} className="text-zinc-600 hover:text-rose-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{conta.titulo}</h3>
                  <p className="text-zinc-500 text-xs mb-4">Vence todo dia <span className="font-bold text-zinc-300">{conta.dia_vencimento}</span></p>
                  <h2 className={`text-3xl font-black text-rose-400 font-mono mb-4 ${classeBlur}`}>
                    R$ {conta.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </h2>
                  {conta.parcelas_totais > 0 ? (
                    <div className="mb-6">
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase mb-2">
                        <span>Pagas: {conta.parcelas_pagas}/{conta.parcelas_totais}</span>
                        <span className={`${classeBlur}`}>Falta R$ {saldoDevedor.toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(conta.parcelas_pagas / conta.parcelas_totais) * 100}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 pt-3 border-t border-zinc-800/50">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Conta Recorrente Fixa</p>
                    </div>
                  )}
                  <button onClick={() => registrarPagamento(conta)} className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm">
                    <CheckCircle2 size={18} /> Marcar como Pago
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 3: METAS                                                */}
      {/* ========================================================= */}
      {abaAtiva === "metas" && (
        <div className="animate-in fade-in duration-500">
          
          {/* FORMULÁRIO DE METAS */}
          <div className={`border rounded-3xl p-6 mb-8 shadow-xl flex flex-col md:flex-row gap-4 items-end transition-colors ${editandoMeta ? 'bg-zinc-900/80 border-blue-500/50 shadow-blue-500/10' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex-1 flex flex-col gap-1 w-full">
              <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2">
                {editandoMeta ? "Editando Título da Meta" : "O que deseja alcançar?"}
              </label>
              <input type="text" placeholder="Ex: Lente 50mm" value={tituloMeta} onChange={(e) => setTituloMeta(e.target.value)} className="bg-zinc-800 p-3 rounded-xl text-sm outline-none border-none focus:ring-2 ring-purple-500 text-white w-full" />
            </div>
            <div className="flex-1 flex flex-col gap-1 w-full">
              <label className="text-[10px] text-zinc-500 font-bold uppercase ml-2">Valor Necessário (R$)</label>
              <input type="text" placeholder="R$ 0,00" value={valorObjetivo} onChange={(e) => setValorObjetivo(formatarMoedaInput(e.target.value))} className="bg-zinc-800 p-3 rounded-xl text-sm outline-none border-none focus:ring-2 ring-purple-500 text-white w-full" />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              {editandoMeta && (
                <button onClick={cancelarEdicaoMeta} className="bg-zinc-800 hover:bg-zinc-700 h-[45px] px-4 rounded-xl font-bold transition text-white flex items-center justify-center">
                  <X size={18} />
                </button>
              )}
              <button onClick={salvarMeta} className={`h-[45px] px-8 rounded-xl font-bold transition active:scale-95 text-white flex items-center gap-2 w-full md:w-auto justify-center ${editandoMeta ? 'bg-blue-600 hover:bg-blue-500' : 'bg-purple-600 hover:bg-purple-500'}`}>
                {editandoMeta ? <Pencil size={18} /> : <Target size={18} />}
                {editandoMeta ? "Atualizar Meta" : "Criar Meta"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metas.map(meta => {
              const progresso = Math.min((meta.valor_atual / meta.valor_objetivo) * 100, 100)
              const concluida = progresso >= 100

              return (
                <div key={meta.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative shadow-lg group flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-400">
                      <Target size={24} />
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => prepararEdicaoMeta(meta)} className="text-zinc-600 hover:text-blue-400 p-2"><Pencil size={18} /></button>
                      <button onClick={() => excluirMeta(meta.id)} className="text-zinc-600 hover:text-rose-500 p-2"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{meta.titulo}</h3>
                  <div className="flex items-end gap-2 mb-6">
                    <h2 className={`text-3xl font-black font-mono ${classeBlur} ${concluida ? 'text-emerald-400' : 'text-zinc-100'}`}>
                      R$ {meta.valor_atual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </h2>
                    <p className={`text-zinc-500 text-sm mb-1 ${classeBlur}`}>/ {meta.valor_objetivo.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p>
                  </div>
                  <div className="mb-6 mt-auto">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase mb-2">
                      <span>Progresso</span>
                      <span className={`${classeBlur} ${concluida ? 'text-emerald-400' : 'text-blue-400'}`}>
                        {progresso.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div className={`h-2 rounded-full transition-all duration-1000 ${concluida ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progresso}%` }} />
                    </div>
                  </div>
                  {!concluida ? (
                    <div className="flex gap-2 bg-zinc-800/50 p-1.5 rounded-2xl border border-zinc-800">
                      <input type="text" placeholder="Guardar rápido..." value={valorAporte[meta.id] || ""} onChange={(e) => setValorAporte({ ...valorAporte, [meta.id]: formatarMoedaInput(e.target.value) })} className="bg-transparent text-sm text-white px-3 w-full outline-none" />
                      <button onClick={() => guardarDinheiro(meta)} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition">
                        <Plus size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/10 text-emerald-400 text-sm font-bold py-3 text-center rounded-2xl border border-emerald-500/20">
                      Objetivo Alcançado! 🎉
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}