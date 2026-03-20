'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as XLSX from 'xlsx'

export default function AdminPage() {
  const [richieste, setRichieste] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notifica, setNotifica] = useState('')
  const [editing, setEditing] = useState<any | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const isAdmin = localStorage.getItem('is_admin') === 'true'
    if (!isAdmin) { router.push('/dashboard'); return }
    fetchRichieste()
  }, [router])

  const fetchRichieste = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('richieste')
        .select('*, dipendenti!richieste_dipendente_id_fkey(nome, email, cellulare)')
        .order('created_at', { ascending: false })

      if (error) {
        const { data: retry } = await supabase.from('richieste').select('*, dipendenti!fk_dipendente(nome, email, cellulare)').order('created_at', { ascending: false })
        setRichieste(retry || [])
      } else {
        setRichieste(data || [])
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(richieste.map(r => ({
      Dipendente: r.dipendenti?.nome || 'N.D.', Tipo: r.tipo_richiesta, Stato: r.stato,
      Inizio: r.data_inizio, Fine: r.data_fine, Note: r.note
    })))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Richieste")
    XLSX.writeFile(wb, "Report_Assenze.xlsx")
  }

  const handleUpdateStatus = async (r: any, nuovoStato: string, nuovoStatus: string) => {
    const { error } = await supabase.from('richieste').update({ stato: nuovoStato, status: nuovoStatus }).eq('id', r.id)
    if (!error) {
      setNotifica(`Stato aggiornato: ${nuovoStato}`)
      fetch('/api/send-email', { method: 'POST', body: JSON.stringify({ to: r.dipendenti?.email, subject: `Aggiornamento: ${nuovoStato}`, html: `La tua richiesta è stata ${nuovoStato}` })})
      setTimeout(() => setNotifica(''), 3000)
      fetchRichieste()
    }
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    await supabase.from('richieste').update({
      data_inizio: editing.data_inizio, data_fine: editing.data_fine,
      ora_inizio: editing.ora_inizio, ora_fine: editing.ora_fine, note: editing.note
    }).eq('id', editing.id)
    setEditing(null); setNotifica("Modifica salvata!"); fetchRichieste()
    setTimeout(() => setNotifica(''), 3000)
  }

  if (loading) return <div className="p-20 text-center font-black text-black text-xl">CARICAMENTO...</div>

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-10 text-black font-sans">
      <div className="max-w-7xl mx-auto">
        
        {notifica && <div className="fixed top-5 right-5 bg-black text-white px-6 py-4 rounded-2xl shadow-2xl z-[200] font-black animate-in fade-in zoom-in text-xs uppercase tracking-widest">{notifica}</div>}

        <div className="flex flex-col lg:flex-row justify-between items-center mb-10 bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Pannello Admin</h1>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Gestione Presenze e Assenze</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={exportToExcel} className="bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] shadow-lg shadow-green-100 hover:bg-green-700 transition-all uppercase">📊 Excel</button>
            <Link href="/admin/calendario" className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all uppercase">🗓️ Calendario</Link>
            <Link href="/admin/dipendenti" className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all uppercase">👥 Dipendenti</Link>
          </div>
        </div>

        <div className="grid gap-6">
          {richieste.map((r) => (
            <div key={r.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:shadow-xl hover:border-blue-100 transition-all group">
              
              {/* INFO DIPENDENTE + SEMAFORO */}
              <div className="flex items-center gap-5 lg:w-1/3">
                {/* BOLLINO SEMAFORO */}
                <div className={`h-4 w-4 rounded-full shrink-0 shadow-lg ${
                  r.stato === 'APPROVATA' ? 'bg-green-500 shadow-green-200' : 
                  r.stato === 'RIFIUTATA' ? 'bg-red-500 shadow-red-200' : 
                  'bg-yellow-400 animate-pulse shadow-yellow-100 border-2 border-white'
                }`}></div>

                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                  r.stato === 'APPROVATA' ? 'bg-green-50' : r.stato === 'RIFIUTATA' ? 'bg-red-50' : 'bg-yellow-50'
                }`}>
                  {r.tipo_richiesta === 'FERIE' ? '🌴' : r.tipo_richiesta === 'MALATTIA' ? '🤒' : '🕒'}
                </div>
                
                <div>
                  <h3 className="font-black text-xl text-gray-900 leading-none">{r.dipendenti?.nome || 'Utente N.D.'}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-50 text-blue-600 uppercase tracking-tighter">{r.tipo_richiesta}</span>
                    <span className={`text-[10px] font-black uppercase ${
                      r.stato === 'APPROVATA' ? 'text-green-600' : r.stato === 'RIFIUTATA' ? 'text-red-600' : 'text-yellow-600'
                    }`}>{r.stato}</span>
                  </div>
                </div>
              </div>

              {/* DETTAGLI DATE */}
              <div className="bg-gray-50/50 p-4 rounded-2xl flex-1 lg:max-w-xs text-center border border-gray-50">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest">Periodo Richiesto</p>
                <p className="text-sm font-bold text-gray-800">
                  {r.data_inizio} {r.data_fine && r.data_fine !== r.data_inizio ? ` al ${r.data_fine}` : ''}
                </p>
                {r.ora_inizio && <p className="text-xs font-black text-blue-600 mt-1 uppercase tracking-tighter">Ore: {r.ora_inizio} - {r.ora_fine}</p>}
                {r.allegato_url && <a href={r.allegato_url} target="_blank" className="mt-2 inline-block text-[10px] font-black text-blue-600 underline uppercase tracking-widest">📎 Allegato</a>}
              </div>

              {/* AZIONI */}
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setEditing(r)} className="p-3 bg-gray-100 rounded-2xl hover:bg-gray-900 hover:text-white transition-all text-lg" title="Modifica">✏️</button>
                <button 
                  onClick={() => handleUpdateStatus(r, 'APPROVATA', 'approved')}
                  className={`px-5 py-3 rounded-2xl font-black text-[10px] transition-all uppercase ${r.stato === 'APPROVATA' ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'bg-green-50 text-green-600 hover:bg-green-600 hover:text-white'}`}
                > ✓ Approva </button>
                <button 
                  onClick={() => handleUpdateStatus(r, 'RIFIUTATA', 'rejected')}
                  className={`px-5 py-3 rounded-2xl font-black text-[10px] transition-all uppercase ${r.stato === 'RIFIUTATA' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white'}`}
                > ✕ Rifiuta </button>
                <button onClick={() => { const msg = `Ciao! Ti comunico che la tua richiesta è stata ${r.stato}.`; window.open(`https://wa.me/${r.dipendenti?.cellulare?.replace('+','') || ''}?text=${encodeURIComponent(msg)}`) }} className="bg-green-500 text-white p-3 rounded-2xl shadow-md hover:scale-110 transition-all font-bold">💬</button>
                <button onClick={async () => { if(confirm("Eliminare?")) { await supabase.from('richieste').delete().eq('id', r.id); fetchRichieste() } }} className="p-3 text-gray-200 hover:text-red-600 transition-colors">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL MODIFICA AL VOLO */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[300]">
          <div className="bg-white w-full max-w-md p-10 rounded-[3rem] shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-3xl font-black mb-8 tracking-tight">Modifica Dati</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-2xl border">
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Inizio</label>
                    <input type="date" className="w-full bg-transparent font-bold outline-none" value={editing.data_inizio} onChange={e => setEditing({...editing, data_inizio: e.target.value})} />
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border">
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Fine</label>
                    <input type="date" className="w-full bg-transparent font-bold outline-none" value={editing.data_fine} onChange={e => setEditing({...editing, data_fine: e.target.value})} />
                </div>
              </div>
              {editing.tipo_richiesta === 'PERMESSO' && (
                <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-2xl">
                    <input type="time" className="bg-white p-2 rounded-lg font-bold" value={editing.ora_inizio} onChange={e => setEditing({...editing, ora_inizio: e.target.value})} />
                    <input type="time" className="bg-white p-2 rounded-lg font-bold" value={editing.ora_fine} onChange={e => setEditing({...editing, ora_fine: e.target.value})} />
                </div>
              )}
              <textarea className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 outline-none focus:border-blue-500 transition-all text-sm" rows={3} value={editing.note} onChange={e => setEditing({...editing, note: e.target.value})} placeholder="Note..." />
              
              <div className="flex gap-3 pt-4">
                <button onClick={() => setEditing(null)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-[10px] uppercase">Annulla</button>
                <button onClick={handleSaveEdit} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-100">Salva Modifiche</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}