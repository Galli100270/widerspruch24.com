import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileText, Plus, X } from "lucide-react";
import { Letter } from "@/entities/Letter";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function CaseLettersDialog({ open, onClose, caseItem, t }) {
  const [loading, setLoading] = React.useState(false);
  const [letters, setLetters] = React.useState([]);

  React.useEffect(() => {
    if (!open || !caseItem) return;
    const load = async () => {
      setLoading(true);
      try {
        const ids = Array.isArray(caseItem.related_letters) ? caseItem.related_letters : [];
        const loaded = [];
        for (const id of ids) {
          try {
            const lt = await Letter.get(id);
            if (lt) loaded.push(lt);
          } catch {}
        }
        setLetters(loaded.sort((a,b) => new Date(b.created_date) - new Date(a.created_date)));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, caseItem]);

  if (!open || !caseItem) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass rounded-2xl p-6 w-full max-w-2xl text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Schreiben zu: {caseItem.sender_name || caseItem.title || caseItem.case_number}</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
          {loading ? (
            <div className="flex items-center gap-2 text-white/80">
              <Loader2 className="w-4 h-4 animate-spin" /> Lädt Schreiben…
            </div>
          ) : letters.length === 0 ? (
            <Card className="glass border-white/20">
              <CardContent className="p-4 text-white/80">
                Noch keine Schreiben mit diesem Fall verknüpft.
              </CardContent>
            </Card>
          ) : (
            letters.map(lt => (
              <Card key={lt.id} className="glass border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 glass rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium">{(lt.facts?.referenz) || 'Schreiben'}</div>
                        <div className="text-xs text-white/60">
                          {new Date(lt.created_date).toLocaleString()}
                        </div>
                        {lt.draft && (
                          <p className="text-white/70 text-sm mt-1 line-clamp-2">{lt.draft.slice(0, 140)}…</p>
                        )}
                      </div>
                    </div>
                    <Link to={createPageUrl(`Schreiben?step=3&id=${lt.id}`)}>
                      <Button size="sm" variant="outline" className="glass border-white/30 text-white hover:bg-white/10">
                        Ansehen
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Link to={createPageUrl(`Schreiben?step=1&case_id=${caseItem.id}`)}>
            <Button className="glass text-white border-white/30 hover:glow">
              <Plus className="w-4 h-4 mr-2" />
              Neues Schreiben erstellen
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}