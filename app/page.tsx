'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

import {
ResponsiveContainer,
BarChart,
Bar,
XAxis,
YAxis,
Tooltip,
CartesianGrid
} from "recharts"

interface Transaction {
id:number
description:string
amount:number
type:"income"|"expense"
status:"pago"|"pendente"
created_at:string
}

export default function Dashboard(){

const [transacoes,setTransacoes] = useState<Transaction[]>([])

async function carregar(){

const {data} = await supabase
.from("transactions")
.select("*")
.order("created_at",{ascending:false})

if(data) setTransacoes(data)

}

useEffect(()=>{
carregar()
},[])

const entradas = transacoes
.filter(t=>t.type==="income")
.reduce((acc,t)=>acc + Number(t.amount),0)

const saidas = transacoes
.filter(t=>t.type==="expense")
.reduce((acc,t)=>acc + Number(t.amount),0)

const saldo = entradas - saidas

const dadosGrafico = [
{ name:"Entradas", valor:entradas },
{ name:"Saídas", valor:saidas }
]

return(

<div className="min-h-screen bg-black text-white p-10">

{/* HEADER */}

<h1 className="text-3xl font-bold mb-10">
Finance <span className="text-purple-500">Dashboard</span>
</h1>


{/* CARDS KPI */}

<div className="grid grid-cols-4 gap-6 mb-10">

<div className="bg-zinc-900 p-6 rounded-2xl">
<p className="text-zinc-400 text-sm">Conta</p>
<h2 className="text-xl font-bold">Investimento</h2>
</div>

<div className="bg-emerald-900/40 p-6 rounded-2xl">
<p className="text-sm text-zinc-400">Entrada</p>
<h2 className="text-2xl font-bold text-emerald-400">
R$ {entradas.toLocaleString("pt-BR")}
</h2>
</div>

<div className="bg-rose-900/40 p-6 rounded-2xl">
<p className="text-sm text-zinc-400">Saída</p>
<h2 className="text-2xl font-bold text-rose-400">
R$ {saidas.toLocaleString("pt-BR")}
</h2>
</div>

<div className="bg-purple-900/40 p-6 rounded-2xl">
<p className="text-sm text-zinc-400">Total</p>
<h2 className="text-2xl font-bold text-purple-400">
R$ {saldo.toLocaleString("pt-BR")}
</h2>
</div>

</div>


{/* GRÁFICO */}

<div className="bg-zinc-900 p-8 rounded-2xl mb-10">

<h2 className="mb-6 font-bold text-lg">
Fluxo Financeiro
</h2>

<ResponsiveContainer width="100%" height={300}>

<BarChart data={dadosGrafico}>

<CartesianGrid strokeDasharray="3 3" stroke="#333"/>

<XAxis dataKey="name"/>

<YAxis/>

<Tooltip/>

<Bar dataKey="valor" radius={[8,8,0,0]}/>

</BarChart>

</ResponsiveContainer>

</div>


{/* TABELA */}

<div className="bg-zinc-900 rounded-2xl p-6">

<h2 className="font-bold mb-6">Transações</h2>

<table className="w-full">

<thead className="text-zinc-400 text-sm">

<tr>

<th className="text-left">Descrição</th>

<th className="text-left">Tipo</th>

<th className="text-right">Valor</th>

</tr>

</thead>

<tbody>

{transacoes.map(t=>(

<tr key={t.id} className="border-t border-zinc-800">

<td className="py-4">{t.description}</td>

<td>{t.type}</td>

<td className="text-right">

R$ {Number(t.amount).toLocaleString("pt-BR")}

</td>

</tr>

))}

</tbody>

</table>

</div>

</div>

)

}