import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ReasonField({ value, onChange, t }){
  return (
    <div>
      <Label htmlFor="reason" className="text-white mb-2 block">{t?.('scanner.reasonLabel') || 'Deine Begründung / Was du der Gegenseite sagen willst'}</Label>
      <Textarea
        id="reason"
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        rows={6}
        className="glass border-white/30 text-white placeholder-white/60"
        placeholder={t?.('scanner.reasonPlaceholder') || 'Warum ist die Forderung falsch? Was ist passiert? Was willst du erreichen?'}
        required
      />
    </div>
  );
}