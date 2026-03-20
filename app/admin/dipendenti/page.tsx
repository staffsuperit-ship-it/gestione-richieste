'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function GestioneDipendenti() {
  const [dipendenti, setDipendenti] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Stato per il nuovo dipendente (Ora con EMAIL inclusa!)
  const [newDip, setNewDip] = useState({
    nome: '',
    email: '',
    cellulare: '',
    is_admin: false
  })

  useEffect(() => {
    const isAdmin = localStorage.getItem('is_admin') === 'true'
    if (!isAdmin) {
      router.push('/')
      return
    }
    fetchDipendenti()
  }, [router])

  const fetchDipendenti = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('dipendenti')
      .select('*')
      .order('nome', { ascending: true })

    if (error) console.error(error)
    else setDipendenti(data || [])
    setLoading(false)
  }

  const handleAddDipendente = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newDip.email.includes('@')) {
      alert("Inserisci un indirizzo email valido!")
      return
    }

    const { error } = await supabase.from('dipendenti').insert([newDip])

    if (error) {
      alert("Errore nell'inserimento: " + error.message)
    } else {
      alert("Dipendente aggiunto con successo!")
      setNewDip({ nome: '', email: '', cellulare: '', is_admin: false })
      setShowForm(false)
      fetchDipendenti()
    }
  }

  const toggleAdmin = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('dipendenti')
      .update({ is_admin: !currentStatus })
      .eq('id', id)
    
    if (error) alert("Errore")
    else fetchDipendenti()
  }

  const eliminaDipendente = async (id: string) => {
    if (!confirm("Sei sicuro? Se elimini il dipendente spariranno anche le sue richieste.")) return
    await supabase.from('dipendenti').delete().eq('id', id)
    fetchDipendenti()
  }

  if (loading) return <div className="p-10 text-center font-bold text-black">Caricamento anagrafica...</div>

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-10 text-black font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/admin" className="text-blue-600 text-sm font-black hover:underline uppercase tracking-tighter">← Torna alle Richieste</Link>
            <h1 className="text-4xl font-black text-gray-900 mt-2 tracking-tight">Anagrafica Dipendenti</h1>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className={`px-8 py-3 rounded-2xl font-black text-sm shadow-lg transition-all ${showForm ? 'bg-red-50 text-red-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {showForm ? 'ANNULLA' : '+ AGGIUNGI DIPENDENTE'}
          </button>
        </div>

        {/* FORM AGGIUNTA (MODIFICATO CON EMAIL) */}
        {showForm && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-blue-50 mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
            <h2 className="text-xl font-black mb-6 text-gray-800">Dati Nuovo Personale</h2>
            <form onSubmit={handleAddDipendente} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Nome e Cognome</label>
                  <input 
                    type="text" placeholder="Es. Mario Rossi" required 
                    className="w-full p-4 bg-gray-50 border-2 border-gray-50 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all"
                    value={newDip.nome} onChange={e => setNewDip({...newDip, nome: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Email Aziendale (Login)</label>
                  <input 
                    type="email" placeholder="nome@azienda.it" required 
                    className="w-full p-4 bg-gray-50 border-2 border-gray-50 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all"
                    value={newDip.email} onChange={e => setNewDip({...newDip, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Numero di Cellulare</label>
                  <input 
                    type="text" placeholder="+39 333 1234567" required 
                    className="w-full p-4 bg-gray-50 border-2 border-gray-50 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all"
                    value={newDip.cellulare} onChange={e => setNewDip({...newDip, cellulare: e.target.value})}
                  />
                </div>
                <div className="flex items-center gap-3 px-4 bg-gray-50 rounded-2xl border-2 border-gray-50">
                  <input 
                    type="checkbox" id="isAdmin" className="w-5 h-5 accent-blue-600"
                    checked={newDip.is_admin} onChange={e => setNewDip({...newDip, is_admin: e.target.checked})}
                  />
                  <label htmlFor="isAdmin" className="text-sm font-black text-gray-700 uppercase tracking-tighter cursor-pointer">Imposta come Amministratore</label>
                </div>
              </div>

              <button type="submit" className="w-full bg-green-600 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-green-100 hover:bg-green-700 transition-all active:scale-95">
                SALVA NUOVO DIPENDENTE
              </button>
            </form>
          </div>
        )}

        {/* LISTA TABELLARE */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b">
              <tr>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nominativo</th>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email / Login</th>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ruolo</th>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dipendenti.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-5">
                    <p className="font-black text-gray-900">{d.nome}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{d.cellulare}</p>
                  </td>
                  <td className="p-5 text-sm font-bold text-blue-600">{d.email}</td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${d.is_admin ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                      {d.is_admin ? 'ADMIN' : 'DIPENDENTE'}
                    </span>
                  </td>
                  <td className="p-5 text-right space-x-4">
                    <button 
                      onClick={() => toggleAdmin(d.id, d.is_admin)}
                      className="text-[10px] font-black text-gray-400 hover:text-blue-600 uppercase tracking-widest"
                    >
                      Cambia Ruolo
                    </button>
                    <button 
                      onClick={() => eliminaDipendente(d.id)}
                      className="text-[10px] font-black text-red-300 hover:text-red-600 uppercase tracking-widest"
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}