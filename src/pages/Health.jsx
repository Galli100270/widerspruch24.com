import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, Activity, Upload, Shield, Server, Globe, Smartphone, Cpu, Loader2, Rocket } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useLocalization } from "@/components/hooks/useLocalization";
import { getErrorBuffer } from "@/components/lib/monitoring";

const StatusIcon = ({ ok }) => ok
  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
  : <AlertTriangle className="w-5 h-5 text-yellow-500" />;

export default function Health() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState({});
  const [extended, setExtended] = useState(false);
  const [error, setError] = useState("");
  const [smoke, setSmoke] = useState(null);
  const [clientDateOk, setClientDateOk] = useState(null);
  const [errorClusters, setErrorClusters] = useState([]);
  const { formatDate } = useLocalization();

  const setRes = (k, v) => setResults(prev => ({ ...prev, [k]: v }));

  const runChecks = async (opts = { extended: false }) => {
    setRunning(true);
    setError("");
    setExtended(!!opts.extended);
    setResults({});
    try {
      // Device and browser basics
      setRes("device", {
        ok: true,
        details: {
          ua: navigator.userAgent,
          width: window.innerWidth,
          height: window.innerHeight,
          dpr: window.devicePixelRatio || 1
        }
      });

      // Local storage
      try {
        const key = "__w24_probe__";
        localStorage.setItem(key, "1");
        const ok = localStorage.getItem(key) === "1";
        localStorage.removeItem(key);
        setRes("localStorage", { ok });
      } catch {
        setRes("localStorage", { ok: false });
      }

      // Cookies
      try {
        document.cookie = "w24_cookie_probe=1; Path=/; SameSite=Lax";
        const ok = document.cookie.includes("w24_cookie_probe=1");
        // cleanup (best effort)
        document.cookie = "w24_cookie_probe=; Path=/; Max-Age=0; SameSite=Lax";
        setRes("cookies", { ok });
      } catch {
        setRes("cookies", { ok: false });
      }

      // Auth
      let isAuthed = false;
      try {
        isAuthed = await base44.auth.isAuthenticated();
      } catch {}
      setRes("auth", { ok: true, authed: !!isAuthed });

      // Entities access (non-fatal)
      try {
        const cases = await base44.entities.Case.list();
        setRes("entities", { ok: true, cases: cases?.length ?? 0 });
      } catch (e) {
        setRes("entities", { ok: false, msg: e?.message || "No access" });
      }

      if (opts.extended) {
        // Upload small probe
        try {
          const blob = new Blob(["demo"], { type: "text/plain" });
          const file = new File([blob], "probe.txt", { type: "text/plain" });
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          setRes("upload", { ok: !!file_url, url: file_url });
        } catch (e) {
          setRes("upload", { ok: false, msg: e?.message || "Upload failed" });
        }

        // Simple LLM ping (no external context)
        try {
          const out = await base44.integrations.Core.InvokeLLM({
            prompt: "Reply with the single word: PONG",
          });
          setRes("llm", { ok: typeof out === "string" ? out.includes("PONG") : true });
        } catch (e) {
          setRes("llm", { ok: false, msg: e?.message || "LLM failed" });
        }
      }

    } catch (e) {
      setError(e?.message || "Unexpected error");
    } finally {
      setRunning(false);
    }
  };

  const runSmoke = async () => {
    try {
      setSmoke({ running: true });
      const res = await base44.functions.invoke('selftest', {});
      const payload = (res && typeof res === 'object' && 'data' in res) ? res.data : res;
      setSmoke({ running: false, data: payload });
    } catch (e) {
      setSmoke({ running: false, error: e?.message || 'Smoke failed' });
    }
  };

  useEffect(() => {
    // Run light checks by default for a quick status on page open
    runChecks({ extended: false });

    // Build error clusters from client buffer
    try {
      const buf = getErrorBuffer();
      const map = new Map();
      buf.forEach(e => {
        const key = e?.message ? String(e.message).slice(0, 200) : 'unknown';
        map.set(key, (map.get(key) || 0) + 1);
      });
      setErrorClusters(Array.from(map.entries()).map(([message, count]) => ({ message, count })).sort((a,b)=>b.count-a.count).slice(0, 10));
    } catch {}

    // Client-side date parser smoke test (regression for "Invalid time value")
    try {
      const samples = [
        '2024-12-31', '2024-12-31T10:15:00', '2024-12-31 10:15:00',
        { year: 2024, month: 12, day: 31 }, { date: '2024-12-31' }
      ];
      const okAll = samples.every(s => {
        const out = formatDate(s, 'short');
        return typeof out === 'string' && out.length > 0 && !/invalid/i.test(out);
      });
      setClientDateOk(okAll);
    } catch {
      setClientDateOk(false);
    }
  }, []);

  const allGood = useMemo(() => {
    const keys = ["device", "localStorage", "cookies", "auth", "entities"];
    const baseOk = keys.every(k => results[k]?.ok !== false);
    const extOk = !extended || (results.upload?.ok !== false && results.llm?.ok !== false);
    return baseOk && extOk;
  }, [results, extended]);

  const CardRow = ({ icon: Icon, title, ok, children }) => (
    <Card className="glass border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Icon className={`w-5 h-5 ${ok ? 'text-green-400' : 'text-yellow-400'}`} />
          {title}
          <span className={`ml-auto text-xs ${ok ? 'text-green-400' : 'text-yellow-400'}`}>
            {ok ? "OK" : "Check"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-white/80 text-sm">
        {children}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-300" />
              Systemcheck
            </h1>
            <p className="text-white/70">Schnelle Prüfung für die Präsentation – Gerät, Login, Datenzugriff und (optional) Upload/LLM.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => runChecks({ extended: false })} 
              disabled={running}
              className="glass text-white border-white/30 hover:glow"
            >
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
              Kurzer Check
            </Button>
            <Button 
              onClick={() => runChecks({ extended: true })} 
              disabled={running}
              variant="outline"
              className="glass border-white/30 text-white hover:bg-white/10"
            >
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Cpu className="w-4 h-4 mr-2" />}
              Erweiterter Check
            </Button>
          </div>
        </div>

        {error && (
          <Alert className="glass border-red-500/50">
            <AlertDescription className="text-white">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <CardRow icon={Smartphone} title="Gerät & Browser" ok={results.device?.ok !== false}>
            <div>Viewport: {results.device?.details?.width}×{results.device?.details?.height}px @ {results.device?.details?.dpr || 1}x</div>
          </CardRow>

          <CardRow icon={Shield} title="Speicher (Cookies & LocalStorage)" ok={(results.cookies?.ok !== false) && (results.localStorage?.ok !== false)}>
            <div>Cookies: <StatusIcon ok={results.cookies?.ok !== false} /> | LocalStorage: <StatusIcon ok={results.localStorage?.ok !== false} /></div>
          </CardRow>

          <CardRow icon={Server} title="Datenzugriff (Entities)" ok={results.entities?.ok !== false}>
            <div>Cases abrufbar: {typeof results.entities?.cases === 'number' ? results.entities.cases : '–'}</div>
            {results.entities?.ok === false && <div className="text-yellow-300 mt-2">Keine Cases oder keine Rechte – für Demo nicht kritisch.</div>}
          </CardRow>

          <CardRow icon={Globe} title="Loginstatus" ok={results.auth?.ok !== false}>
            <div>Angemeldet: {results.auth?.authed ? "Ja" : "Nein"}</div>
            {!results.auth?.authed && (
              <div className="mt-2">
                <Button 
                  onClick={() => window.location.href = createPageUrl('Home')}
                  size="sm"
                  className="glass text-white border-white/30 hover:glow"
                >
                  Zur Startseite / Anmelden
                </Button>
              </div>
            )}
          </CardRow>

          <CardRow icon={Activity} title="Smoke Tests (Backend)" ok={smoke?.data ? smoke.data.fail === 0 : true}>
            <div className="flex items-center gap-2">
              <Button onClick={runSmoke} size="sm" className="glass text-white border-white/30 hover:glow" disabled={smoke?.running}>
                {smoke?.running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Start
              </Button>
              {smoke?.data && (
                <div className="text-xs">OK: {smoke.data.ok} • FAIL: {smoke.data.fail} • Dauer: {smoke.data.duration_ms}ms</div>
              )}
              {smoke?.error && <div className="text-xs text-yellow-300">{smoke.error}</div>}
            </div>
          </CardRow>

          <CardRow icon={AlertTriangle} title="Client-Fehler (letzte Session)" ok={true}>
            <div className="space-y-1">
              <div className="text-xs">Date Parser: {clientDateOk === null ? '–' : (clientDateOk ? 'OK' : 'Fehler')}</div> '–' : (clientDateOk ? 'OK' : 'Fehler')}</div>' : (clientDateOk ? 'OK' : 'Fehler')}</div>
              {errorClusters?.length ? (
                <ul className="text-xs list-disc ml-4">
                  {errorClusters.slice(0,5).map((e,i) => (
                    <li key={i}>{e.message}  d7{e.count}</li>
                  ))}
                </ul>
              ) : <div className="text-xs">Keine Fehler aufgezeichnet.</div>}
            </div>
          </CardRow>

          {extended && (
            <>
              <CardRow icon={Upload} title="Datei-Upload" ok={results.upload?.ok !== false}>
                <div>{results.upload?.ok ? "Upload erfolgreich" : (results.upload?.msg || "–")}</div>
              </CardRow>
              <CardRow icon={Activity} title="LLM-Antwort" ok={results.llm?.ok !== false}>
                <div>{results.llm?.ok ? "OK" : (results.llm?.msg || "–")}</div>
              </CardRow>
            </>
          )}
        </div>

        <div className="glass rounded-xl p-4 text-white/80">
          <div className="flex items-center gap-2">
            Gesamtergebnis: <StatusIcon ok={allGood} /> {allGood ? "Bereit für die Präsentation" : "Einige Punkte prüfen"}
          </div>
          <div className="text-xs text-white/60 mt-2">
            Tipp: Für die Demo können Sie ?present=1 an die URL anhängen, um Animationen zu reduzieren und die Performance zu optimieren.
          </div>
        </div>
      </div>
    </div>
  );
}