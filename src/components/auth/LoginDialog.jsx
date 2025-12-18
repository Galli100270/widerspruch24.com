
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AppleLoginButton from "@/components/auth/AppleLoginButton";
import { useLocalization } from "@/components/hooks/useLocalization";
import { User as UserEntity } from "@/entities/User";
import { createPageUrl } from "@/utils";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3A12.9 12.9 0 1 1 24 11a12.6 12.6 0 0 1 8.9 3.5l5.7-5.7A20.9 20.9 0 0 0 24 3C12.3 3 3 12.3 3 24s9.3 21 21 21 21-9.3 21-21c0-1.2-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12.9 12.9 0 0 1 24 11c3.1 0 5.9 1.1 8.1 3l5.9-5.9A20.9 20.9 0 0 0 24 3C16 3 9.1 7.6 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 45c5.6 0 10.7-2.1 14.5-5.6l-6.7-5.5A12.8 12.8 0 0 1 24 37a12.9 12.9 0 0 1-12.1-8.8l-6.6 5.1A21 21 0 0 0 24 45z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a13 13 0 0 1-4.4 6c0 0 0 0 0 0l6.7 5.5c-0.5.4 6.4-4.6 6.4-15.9 0-1.2-.1-2.3-.4-3.5z"/>
  </svg>
);

export default function LoginDialog({ open, onOpenChange, returnTo }) {
  const { t } = useLocalization();

  // Erzeuge IMMER eine absolute URL für die Rückleitung (SDK verlangt full url)
  const makeAbsolute = (pathOrUrl) => {
    if (typeof window === "undefined") return pathOrUrl || "/";
    try {
      // bereits absolute URL?
      const u = new URL(pathOrUrl);
      return u.href;
    } catch {
      // relative Angabe -> in absolute umwandeln
      const relative =
        typeof pathOrUrl === "string" && pathOrUrl.startsWith("/")
          ? pathOrUrl
          : createPageUrl(pathOrUrl || "Dashboard");
      return window.location.origin + relative;
    }
  };

  const defaultAfter = createPageUrl("Dashboard");
  const rawTarget =
    returnTo ||
    (typeof window !== "undefined"
      ? (window.location.pathname + window.location.search) || defaultAfter
      : defaultAfter);
  const target = makeAbsolute(rawTarget);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[92vw] glass border-white/20 p-0 overflow-hidden">
        <div className="bg-white text-slate-900">
          <DialogHeader className="px-6 pt-6">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=96&q=60"
                alt=""
                className="w-8 h-8 rounded"
                loading="lazy"
              />
            </div>
            <DialogTitle className="text-center text-2xl font-extrabold mt-4">
              {t("auth.welcome", { brand: "Widerspruch24.com" })}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t("auth.sign_in_to_continue")}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-3">
            {/* Apple (HIG: zuerst) */}
            <AppleLoginButton returnTo={target} variant="black" className="w-full rounded-lg py-6" />

            {/* Google: direkt zum OAuth, keine zweite Provider-Seite */}
            <Button
              variant="outline"
              className="w-full justify-center gap-2 rounded-lg py-6 border-slate-200"
              onClick={async () => {
                try {
                  // Merke gewünschte Ziel-URL für die Post-Login-Weiterleitung
                  if (typeof window !== "undefined") {
                    localStorage.setItem("w24_post_login", target);
                  }
                  // Direkt in den Google-Flow springen (ohne Zwischenseite)
                  await UserEntity.login();
                } catch (e) {
                  // Fallback: generische Login-Seite mit absoluter URL
                  await UserEntity.loginWithRedirect(target);
                }
              }}
              aria-label={t("auth.continue_with_google")}
            >
              <GoogleIcon />
              {t("auth.continue_with_google")}
            </Button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">{t("auth.or")}</span>
              </div>
            </div>

            {/* Hinweis, keine E-Mail/Passwort-Form wegen Plattform-Login */}
            <p className="text-xs text-slate-500 text-center">
              {t("auth.hint_no_password")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
