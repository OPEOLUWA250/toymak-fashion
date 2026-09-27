'use client';
import { useEffect, useState } from 'react';
interface Activity { id: number; actor: string; action: string; entity_id: string; created_at: string }
export function OperationsView() {
  const [activity, setActivity] = useState<Activity[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); setError(''); try { const r = await fetch('/api/admin/activity'); const data = await r.json(); if (!r.ok) throw new Error(data.error); setActivity(data.activity ?? []); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load records.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  return <div className="space-y-4">{error && <p role="alert" className="text-red-700">{error} <button className="underline" onClick={load}>Retry</button></p>}{loading ? <p>Loading…</p> : <><p className="text-sm text-neutral-500">Latest 100 changes. Changes aren't yet attributed to individual admins.</p>{activity.length ? activity.map(item => <div key={item.id} className="break-words border bg-white p-4 text-sm"><p className="font-semibold">{item.action}</p><p>{item.entity_id}</p><p className="text-neutral-500">{item.actor} · {new Date(item.created_at).toLocaleString()}</p></div>) : <p>No activity recorded yet.</p>}</>}</div>;
}
