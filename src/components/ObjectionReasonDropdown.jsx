import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check, Scale } from "lucide-react";

export default function ObjectionReasonDropdown({ value, options = [], onChange, t }) {
  const current = options.find(o => o.id === value);
  const label = current ? current.label : (t ? t("reasons.selectPrompt") : "Einspruchsgrund auswählen");

  return (
    <div className="w-full">
      <div className="mb-2 text-sm text-slate-600 flex items-center gap-2">
        <Scale className="w-4 h-4" />
        {t ? (t("reasons.title") || "Haupt‑Einspruchsgrund") : "Haupt‑Einspruchsgrund"}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="w-full justify-between" variant="outline">
            <span className="truncate">{label}</span>
            <ChevronDown className="w-4 h-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] overflow-hidden">
          <div className="max-h-64 overflow-auto transition-all duration-200">
            {options.map((opt) => (
              <DropdownMenuItem
                key={opt.id}
                onClick={() => onChange?.(opt.id, opt)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 text-center">{opt.icon || "•"}</div>
                  <div className="flex-1">
                    <div className="font-medium">{opt.label}</div>
                    {opt.desc && <div className="text-xs text-slate-500">{opt.desc}</div>}
                  </div>
                  {value === opt.id && <Check className="w-4 h-4 text-green-600" />}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}