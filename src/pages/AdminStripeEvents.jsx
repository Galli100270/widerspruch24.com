import React, { useEffect, useState, useMemo } from "react";
import { StripeEvent } from "@/entities/StripeEvent";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminStripeEvents() {
  const [events, setEvents] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const list = await StripeEvent.list('-received_at', 200);
        setEvents(list || []);
      } catch (e) {
        setEvents([]);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return events;
    return events.filter(e =>
      (e.event_type || '').toLowerCase().includes(term) ||
      (e.status || '').toLowerCase().includes(term)
    );
  }, [q, events]);

  const statusColor = (s) => {
    if (s === 'done') return 'bg-green-500/20 text-green-300';
    if (s === 'processing') return 'bg-yellow-500/20 text-yellow-300';
    if (s === 'failed') return 'bg-red-500/20 text-red-300';
    return 'bg-slate-500/20 text-slate-300';
    };

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-white">Stripe Events (Admin)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Filter by type or status..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="glass border-white/30 text-white placeholder-white/60"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-white/60">
                  <tr>
                    <th className="text-left p-2">receivedAt</th>
                    <th className="text-left p-2">type</th>
                    <th className="text-left p-2">status</th>
                    <th className="text-left p-2">effect</th>
                    <th className="text-left p-2">id</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(ev => (
                    <tr key={ev.id} className="border-t border-white/10">
                      <td className="p-2 text-white/90">{ev.received_at || ev.created_date}</td>
                      <td className="p-2 text-white">{ev.event_type}</td>
                      <td className="p-2">
                        <Badge className={statusColor(ev.status)}>{ev.status}</Badge>
                      </td>
                      <td className="p-2 text-white/80">{ev.plan_type || '-'}</td>
                      <td className="p-2 text-white/50">{(ev.event_id || '').slice(0, 10)}…</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-white/60">No events</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-white/60 text-sm">
              Tip: Add this page to your admin bookmarks. Only admins can see Stripe events.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}