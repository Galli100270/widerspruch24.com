import React from "react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // Log minimal, ohne PII
    try { console.error("[ErrorBoundary]", error, info); } catch {}
  }
  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === "function") {
      try { this.props.onReset(); } catch {}
    }
  };
  handleReload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };
  handleHome = () => {
    if (typeof window !== "undefined") window.location.href = createPageUrl("Home");
  };
  render() {
    const t = (k, f) => {
      try {
        if (typeof this.props.t === "function") {
          const v = this.props.t(k);
          return !v || v === k ? f : v;
        }
      } catch {}
      return f;
    };

    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center text-white">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/20 border border-red-400/30 flex items-center justify-center">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-xl font-bold mb-2">
            {t("errorBoundary.title", "Ups, etwas ist schiefgelaufen.")}
          </h2>
          <p className="text-white/80 text-sm mb-6">
            {t("errorBoundary.subtitle", "Bitte versuchen Sie es erneut. Falls das Problem bleibt, laden Sie die Seite neu.")}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={this.handleRetry} className="glass text-white border-white/30 hover:glow">
              {t("common.retry", "Erneut versuchen")}
            </Button>
            <Button onClick={this.handleReload} variant="outline" className="glass border-white/30 text-white hover:bg-white/10">
              {t("common.reload", "Neu laden")}
            </Button>
            <Button onClick={this.handleHome} variant="outline" className="glass border-white/30 text-white hover:bg-white/10">
              {t("common.backHome", "Zur Startseite")}
            </Button>
          </div>
          <div className="mt-4 text-xs text-white/50 break-all">
            {/* Hide raw technical errors from end users; still logged in console */}
          </div>
        </div>
      </div>
    );
  }
}