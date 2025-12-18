import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, FileText, Activity } from "lucide-react";

export default function Admin({ t }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const currentUser = await User.me();
        if (currentUser && currentUser.role === 'admin') {
          setUser(currentUser);
        } else {
          navigate(createPageUrl('Home'));
        }
      } catch (error) {
        navigate(createPageUrl('Home'));
      }
      setIsLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  if (isLoading || !t) {
    return (
      <div className="min-h-screen px-4 py-16">
        <div className="max-w-6xl mx-auto"><div className="glass rounded-3xl p-8 text-center text-white">Loading Admin...</div></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">{t('adminTitle')}</h1>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="glass">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/80">Umsatz (Heute)</CardTitle>
                    <DollarSign className="h-4 w-4 text-white/60" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">1,250.00€</div>
                    <p className="text-xs text-white/60">+15% zum Vortag</p>
                </CardContent>
            </Card>
            <Card className="glass">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/80">Aktive Abos</CardTitle>
                    <Users className="h-4 w-4 text-white/60" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">+120</div>
                    <p className="text-xs text-white/60">+5 in diesem Monat</p>
                </CardContent>
            </Card>
            <Card className="glass">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/80">Offene Dunning-Fälle</CardTitle>
                    <FileText className="h-4 w-4 text-white/60" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">5</div>
                    <p className="text-xs text-white/60">3 davon kritisch</p>
                </CardContent>
            </Card>
             <Card className="glass">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/80">Webhook Status</CardTitle>
                    <Activity className="h-4 w-4 text-white/60" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-400">OK</div>
                    <p className="text-xs text-white/60">Letzter Ping: 2min her</p>
                </CardContent>
            </Card>
        </div>

        <div className="glass rounded-3xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Weitere Features</h2>
            <p className="text-white/80">
                Hier werden in Zukunft Funktionen wie eine detaillierte Fall-Suche,
                der Export von Nutzerdaten und die Analyse der Webhook-Logs verfügbar sein.
            </p>
        </div>
      </div>
    </div>
  );
}