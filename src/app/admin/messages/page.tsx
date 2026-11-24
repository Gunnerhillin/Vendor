"use client"
import {useEffect,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
export default function Messages(){
 const [items,setItems]=useState<any[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 useEffect(()=>{(async()=>{const {data,error}=await createClient().from('contact_messages').select('*').order('created_at',{ascending:false}).limit(100);if(error)setError('Unable to load messages. Check admin access and database setup.');else setItems(data||[]);setLoading(false)})()},[])
 async function resolve(item:any){const status=item.status==='new'?'resolved':'new';const {error}=await createClient().from('contact_messages').update({status}).eq('id',item.id);if(error)setError('Unable to update message');else setItems(items.map(i=>i.id===item.id?{...i,status}:i))}
 return <main className="max-w-3xl space-y-4"><h1 className="text-3xl font-bold">Customer messages</h1><p>Contact submissions are saved here. Reply from your support email account; marking a message resolved does not send an email.</p><p role="status">{error|| (loading?'Loading…':!items.length?'No messages yet':'Showing the latest 100 messages')}</p>{items.map(item=><article key={item.id} className="card p-5 space-y-2"><h2 className="font-semibold">{item.subject} · {item.status}</h2><p>{item.name} · <a className="underline" href={`mailto:${item.email}`}>{item.email}</a></p><p className="text-xs">{new Date(item.created_at).toLocaleString()}</p><p className="whitespace-pre-wrap break-words">{item.message}</p><button className="btn-secondary" onClick={()=>resolve(item)}>{item.status==='new'?'Mark resolved':'Reopen'}</button></article>)}</main>
}
