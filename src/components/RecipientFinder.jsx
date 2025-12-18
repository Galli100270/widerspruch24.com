import React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Briefcase, Shield, Mail, Printer, Globe, Search } from "lucide-react";
import { recipients as searchRecipients } from "@/functions/recipients";

const CategoryBadge = ({ category }) => {
  const map = {
    "behörde": { label: "Behörde", icon: Building2, cls: "bg-blue-500/15 text-blue-200 border-blue-400/30" },
    "firma": { label: "Firma", icon: Briefcase, cls: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30" },
    "ombudsstelle": { label: "Ombudsstelle", icon: Shield, cls: "bg-amber-500/15 text-amber-200 border-amber-400/30" },
  };
  const cfg = map[category] || { label: category || "Sonstiges", icon: Briefcase, cls: "bg-slate-500/15 text-slate-200 border-slate-400/30" };
  const Icon = cfg.icon;
  return (
    <Badge className={`border ${cfg.cls} gap-1`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </Badge>
  );
};

export default function RecipientFinder({ onPick }) {
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    const id = setTimeout(async () => {
      if (!q.trim()) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const { data } = await searchRecipients({ q, limit: 8 });
        setItems(data?.items || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <div className="space-y-2">
      <label className="text-white/80 text-sm">Empfänger-Finder</label>
      <div className="relative">
        <Input
          value={q}
          onChange={(e) => { setQ(e.target.value); setTouched(true); }}
          placeholder="z. B. Jobcenter Berlin, Vodafone, Ombudsstelle …"
          className="glass border-white/30 text-white placeholder-white/60 pr-10"
        />
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-white/60" />
        {touched && q && (
          <div className="absolute z-20 mt-2 left-0 right-0 glass rounded-xl p-2 border border-white/20 max-h-64 overflow-auto">
            {loading ? (
              <div className="text-white/70 text-sm px-2 py-1">Suche…</div>
            ) : items.length === 0 ? (
              <div className="text-white/70 text-sm px-2 py-1">Keine Treffer.</div>
            ) : (
              <ul className="space-y-2">
                {items.map((it) => (
                  <li key={it.id} className="rounded-lg border border-white/10 p-2 hover:bg-white/5 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-white font-medium">{it.name}</div>
                        <div className="text-white/70 text-xs mt-1 whitespace-pre-line">
                          {(it.address_lines || []).join("\n")}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <CategoryBadge category={it.category} />
                          {it.email && (
                            <Badge className="border border-white/20 text-white/80 bg-white/10 gap-1">
                              <Mail className="w-3.5 h-3.5" /> E-Mail
                            </Badge>
                          )}
                          {it.fax && (
                            <Badge className="border border-white/20 text-white/80 bg-white/10 gap-1">
                              <Printer className="w-3.5 h-3.5" /> Fax
                            </Badge>
                          )}
                          {it.website && (
                            <Badge className="border border-white/20 text-white/80 bg-white/10 gap-1">
                              <Globe className="w-3.5 h-3.5" /> Web
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="glass text-white border-white/30 hover:glow"
                        onClick={() => onPick?.(it)}
                      >
                        Übernehmen
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}