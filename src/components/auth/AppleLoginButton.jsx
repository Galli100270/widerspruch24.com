
import React from "react";
import { Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalization } from "@/components/hooks/useLocalization";
import { User as UserEntity } from "@/entities/User";
import { appleAuthStart } from "@/functions/appleAuthStart";

/**
 * Reusable Apple Sign-In button.
 * - Uses our existing backend flow (appleAuthStart)
 * - Falls back to regular login redirect on error
 * - Variant: "black" | "white" (default: black)
 */
export default function AppleLoginButton({ returnTo, variant = "black", className = "" }) {
  const { t } = useLocalization();
  const target = returnTo || (typeof window !== "undefined" ? (window.location.pathname + window.location.search) : "/Dashboard");

  const isBlack = variant === "black";
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-medium transition-all duration-200 focus:outline-none";
  const blackCls = "bg-black text-white border border-white/20 hover:bg-black/90";
  const whiteCls = "bg-white text-black border border-gray-300 hover:bg-gray-100";
  const cls = `${base} ${isBlack ? blackCls : whiteCls} ${className}`.trim();

  const handleClick = async () => {
    try {
      // Ziel-URL nach Login merken (für sichere Weiterleitung)
      if (typeof window !== "undefined") {
        localStorage.setItem("w24_post_login", target);
      }
      const { data } = await appleAuthStart({ returnTo: target });
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      // Fallback if backend didn't return URL
      await UserEntity.loginWithRedirect(window.location.href);
    } catch (error) {
      console.error("Apple Sign-In initiation failed:", error);
      // Fallback to regular login
      await UserEntity.loginWithRedirect(window.location.href);
    }
  };

  return (
    <Button
      onClick={handleClick}
      className={cls}
      aria-label={t('auth.continue_with_apple')}
      title={t('auth.continue_with_apple')}
    >
      <Apple className="w-4 h-4" />
      {t('auth.continue_with_apple')}
    </Button>
  );
}
