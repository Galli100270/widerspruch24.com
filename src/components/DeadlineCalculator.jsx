import React from "react";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}
function nextBusinessDay(date) {
  let d = new Date(date);
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
}
export function computeDeadline(baseDate, days = 14) {
  const d = addDays(new Date(baseDate), days);
  return nextBusinessDay(d);
}

export default function DeadlineCalculator({ baseDate, defaultDays = 14, onPick }) {
  const [days, setDays] = React.useState(defaultDays);
  const [date, setDate] = React.useState(() => {
    try { return computeDeadline(baseDate || new Date(), defaultDays).toISOString().slice(0,10); }
    catch { return ""; }
  });

  const recalc = () => {
    if (!baseDate) return;
    const d = computeDeadline(baseDate, Number(days) || defaultDays);
    setDate(d.toISOString().slice(0,10));
  };

  React.useEffect(recalc, [baseDate, days]);

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
      <div className="flex flex-col">
        <label className="text-white/80 text-sm mb-1">Tage bis Frist</label>
        <Input
          type="number"
          value={days}
          min={7}
          max={60}
          onChange={(e) => setDays(e.target.value)}
          className="glass border-white/30 text-white"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-white/80 text-sm mb-1">Fristdatum</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="glass border-white/30 text-white"
        />
      </div>
      <Button className="glass text-white border-white/30 hover:glow" onClick={() => onPick?.(date)}>
        <Check className="w-4 h-4 mr-2" /> Übernehmen
      </Button>
    </div>
  );
}