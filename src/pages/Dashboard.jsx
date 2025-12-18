
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Case } from "@/entities/Case";
import { Transaction } from "@/entities/Transaction";
import { generateInvoice } from "@/functions/generateInvoice";
import { scheduleReminders } from "@/functions/scheduleReminders";
import InvoiceModal from "@/components/InvoiceModal";
import CaseLettersDialog from "@/components/CaseLettersDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText, Calendar, Euro, Download, Eye, Plus, Archive,
  Briefcase, CreditCard, Loader2, Bell, BellOff, AlertTriangle, CheckCircle,
  Trash2, Undo2, CheckSquare, Square
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import CardSkeleton from '@/components/CardSkeleton';
import { updateCaseSafe } from "@/components/lib/caseUtils";

export default function Dashboard({ t, language }) {
  const [user, setUser] = useState(null);
  const [cases, setCases] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isDownloading, setIsDownloading] = useState(null);
  const [schedulingReminder, setSchedulingReminder] = useState(null);
  const [reminderResults, setReminderResults] = useState({});
  const [lettersDialogCase, setLettersDialogCase] = useState(null);
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  if (!t) return null;

  // Sichere Datumsformatierung
  const formatSafeDate = (dateString, formatPattern = 'dd.MM.yyyy') => {
    if (!dateString) return '...';

    try {
      let date;
      if (typeof dateString === 'string') {
        date = dateString.includes('T') || dateString.endsWith('Z') ? parseISO(dateString) : new Date(dateString);
      } else if (dateString instanceof Date) {
        date = dateString;
      } else {
        date = new Date(dateString);
      }

      if (isValid(date) && !isNaN(date.getTime())) {
        return format(date, formatPattern);
      }

      return '...';
    } catch (error) {
      console.warn('Date formatting error in Dashboard:', dateString, error);
      return '...';
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      if (!userData) {
          window.location.href = createPageUrl('Home');
          return;
      }
      setUser(userData);
      const [casesData, transactionsData] = await Promise.all([
        Case.filter({ created_by: userData.email }, '-created_date'),
        Transaction.filter({ userEmail: userData.email }, '-created_date')
      ]);
      setCases(casesData);
      setTransactions(transactionsData);
      setSelectedCaseIds([]); // Auswahl zurücksetzen
    } catch (error) {
      console.error("Fehler beim Laden der Dashboard-Daten:", error);
    }
    setIsLoading(false);
  };

  const handleDownloadInvoice = async (transactionId) => {
    setIsDownloading(transactionId);
    try {
        const response = await generateInvoice({ transactionId });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const invoiceNumber = transactions.find(t => t.id === transactionId)?.invoiceNumber || 'rechnung';
        a.download = `rechnung-${invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error) {
        console.error("Fehler beim Herunterladen der Rechnung:", error);
        alert("Fehler beim Herunterladen der Rechnung. Bitte versuchen Sie es später erneut.");
    } finally {
        setIsDownloading(null);
    }
  };

  const handleScheduleReminder = async (caseId) => {
    setSchedulingReminder(caseId);
    try {
      const result = await scheduleReminders({ caseId });
      setReminderResults(prev => ({
        ...prev,
        [caseId]: result
      }));

      // Reload data to get updated case info
      // Add a small delay to ensure backend updates might be propagated
      setTimeout(() => {
        loadData();
      }, 1000);

    } catch (error) {
      console.error('Fehler beim Planen der Erinnerung:', error);
      setReminderResults(prev => ({
        ...prev,
        [caseId]: { success: false, error: error.message || 'Unknown error' }
      }));
    } finally {
      setSchedulingReminder(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
      preview: { className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      detailed: { className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      paid: { className: "bg-green-500/20 text-green-400 border-green-500/30" },
      completed: { className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
      archived: { className: "bg-gray-700/20 text-gray-500 border-gray-600/30" }
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge className={config.className}>{t(`caseStatus.${status}`)}</Badge>;
  };

  const getReminderStatus = (caseData) => {
    if (!caseData.deadline) return null;

    const deadline = new Date(caseData.deadline);
    const now = new Date();
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    const hasActiveReminder = caseData.reminder_jobs?.some(job => job.status === 'scheduled');
    const hasNotifications = caseData.notify?.enabled; // Assuming `notify` is an object with an `enabled` property

    if (daysUntil < 0) {
      return { type: 'overdue', days: Math.abs(daysUntil), icon: AlertTriangle, color: 'text-red-400' };
    } else if (daysUntil <= 2 && !hasActiveReminder) { // Urgent if close to deadline and no active reminder
      return { type: 'urgent', days: daysUntil, icon: AlertTriangle, color: 'text-amber-400' };
    } else if (hasActiveReminder) {
      return { type: 'scheduled', days: daysUntil, icon: Bell, color: 'text-green-400' };
    } else if (hasNotifications) { // Has notifications enabled but no active job scheduled yet
      return { type: 'ready', days: daysUntil, icon: BellOff, color: 'text-blue-400' };
    }

    return { type: 'none', days: daysUntil, icon: Calendar, color: 'text-white/60' };
  };

  // Auswahl-Helpers
  const toggleSelect = (id) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const selectAll = (list) => {
    const ids = list.map((c) => c.id);
    setSelectedCaseIds(ids);
  };
  const clearSelection = () => setSelectedCaseIds([]);

  // Aktionen
  const moveToTrash = async (ids) => {
    const validIds = (ids || []).filter((id) => cases.some((c) => c.id === id));
    if (!validIds.length) return;
    if (!window.confirm(`Ausgewählte ${validIds.length} Fall/Fälle in den Papierkorb verschieben?`)) return;

    // Use baseCase from local state to avoid refetch and ensure correct origin
    for (const id of validIds) {
      const baseCase = cases.find((c) => c.id === id);
      await updateCaseSafe(id, { trashed: true, deleted_at: new Date().toISOString() }, baseCase);
    }
    await loadData();
  };

  const restoreFromTrash = async (id) => {
    const baseCase = cases.find((c) => c.id === id);
    await updateCaseSafe(id, { trashed: false, deleted_at: null }, baseCase);
    await loadData();
  };

  const deleteForever = async (ids) => {
    const validIds = (ids || []).filter((id) => cases.some((c) => c.id === id));
    if (!validIds.length) return;
    if (!window.confirm(`Endgültig löschen: ${validIds.length} Fall/Fälle? Dieser Vorgang kann nicht rückgängig gemacht werden.`)) return;

    for (const id of validIds) {
      // Only attempt delete if still present
      const exists = cases.some((c) => c.id === id);
      if (exists) {
        await Case.delete(id);
      }
    }
    await loadData();
  };

  const activeCases = cases.filter(c => !c.trashed && c.status !== 'completed' && c.status !== 'archived');
  const archivedCases = cases.filter(c => !c.trashed && (c.status === 'completed' || c.status === 'archived'));
  const trashedCases = cases.filter(c => c.trashed);
  const totalAmount = transactions.reduce((acc, t) => acc + (t.amount || 0), 0) / 100;
  const casesWithDeadlines = activeCases.filter(c => c.deadline);

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 py-16">
        <div className="max-w-6xl mx-auto">
           {/* Header Skeleton */}
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <div className="h-10 bg-slate-700/50 rounded-md w-72 mb-3 animate-pulse"></div>
                <div className="h-5 bg-slate-700/50 rounded-md w-96 animate-pulse"></div>
              </div>
              <div className="h-12 bg-slate-700/50 rounded-2xl w-48 animate-pulse"></div>
            </div>
            {/* Stat Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
            {/* Tabs Skeleton */}
            <div className="glass rounded-3xl p-6">
                <div className="h-10 bg-slate-700/50 rounded-lg w-64 mb-6 animate-pulse"></div>
                <CardSkeleton />
                <CardSkeleton />
            </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {editingTransaction && (
        <InvoiceModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={() => {
            setEditingTransaction(null);
            loadData();
          }}
          t={t}
        />
      )}
      {lettersDialogCase && (
        <CaseLettersDialog
          open={!!lettersDialogCase}
          onClose={() => setLettersDialogCase(null)}
          caseItem={lettersDialogCase}
          t={t}
        />
      )}
      <div className="min-h-screen px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{t('dashboard.title')}</h1>
              <p className="text-white/80">{t('dashboard.welcome', { name: user?.full_name || 'Nutzer' })}</p>
            </div>
            <Link to={createPageUrl("Scanner")}>
              <Button className="glass text-white border-white/30 hover:glow transition-all duration-300 rounded-2xl px-6 py-3">
                <Plus className="w-4 h-4 mr-2" />{t('dashboard.newObjection')}
              </Button>
            </Link>
          </div>

          {/* Enhanced Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <FileText className="w-8 h-8 text-blue-400" /><span className="text-2xl font-bold text-white">{cases.length}</span>
              </div>
              <p className="text-white font-medium">{t('dashboard.totalCases')}</p><p className="text-white/60 text-sm">{t('dashboard.totalCasesDesc')}</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Euro className="w-8 h-8 text-green-400" /><span className="text-2xl font-bold text-white">{totalAmount.toFixed(2)}€</span>
              </div>
              <p className="text-white font-medium">{t('dashboard.spent')}</p><p className="text-white/60 text-sm">{t('dashboard.spentDesc')}</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="w-8 h-8 text-purple-400" /><span className="text-2xl font-bold text-white">{activeCases.length}</span>
              </div>
              <p className="text-white font-medium">{t('dashboard.activeCases')}</p><p className="text-white/60 text-sm">{t('dashboard.activeCasesDesc')}</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Bell className="w-8 h-8 text-amber-400" /><span className="text-2xl font-bold text-white">{casesWithDeadlines.length}</span>
              </div>
              <p className="text-white font-medium">Fristen überwacht</p><p className="text-white/60 text-sm">Fälle mit Erinnerungen</p>
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="glass mb-6">
                <TabsTrigger value="active" className="text-white data-[state=active]:bg-white/10 data-[state=active]:text-white gap-2"><Briefcase className="w-4 h-4"/>{t('dashboard.tabActive', { count: activeCases.length })}</TabsTrigger>
                <TabsTrigger value="invoices" className="text-white data-[state=active]:bg-white/10 data-[state=active]:text-white gap-2"><CreditCard className="w-4 h-4"/>{t('dashboard.tabInvoices', { count: transactions.length })}</TabsTrigger>
                <TabsTrigger value="completed" className="text-white data-[state=active]:bg-white/10 data-[state=active]:text-white gap-2"><Archive className="w-4 h-4"/>{t('dashboard.tabArchive', { count: archivedCases.length })}</TabsTrigger>
                <TabsTrigger value="trash" className="text-white data-[state=active]:bg-white/10 data-[state=active]:text-white gap-2"><Trash2 className="w-4 h-4"/>Papierkorb ({trashedCases.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                {/* Bulk-Aktionsleiste */}
                {selectedCaseIds.length > 0 && (
                  <div className="glass border-white/20 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-white/80 text-sm">{selectedCaseIds.length} ausgewählt</div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" className="glass border-white/30 text-white" onClick={() => moveToTrash(selectedCaseIds)}>
                        <Trash2 className="w-4 h-4 mr-2" /> In Papierkorb
                      </Button>
                      <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={() => deleteForever(selectedCaseIds)}>
                        Endgültig löschen
                      </Button>
                      <Button variant="ghost" className="text-white/70" onClick={clearSelection}>Auswahl aufheben</Button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {activeCases.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">{t('dashboard.noActiveCases')}</p>
                      <Link to={createPageUrl("Scanner")}>
                        <Button className="glass text-white border-white/30 hover:glow transition-all duration-300 rounded-2xl">{t('dashboard.createFirst')}</Button>
                      </Link>
                    </div>
                  ) : (
                    activeCases.map(case_ => {
                      const reminderStatus = getReminderStatus(case_);
                      const result = reminderResults[case_.id];
                      const selected = selectedCaseIds.includes(case_.id);

                      return (
                        <Card key={case_.id} className="glass border-white/20">
                          <CardContent className="p-6">
                            <div className="flex flex-col gap-4">
                              <div className="flex items-start justify-between gap-4">
                                {/* Checkbox + Titel */}
                                <div className="flex items-start gap-3 flex-grow">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleSelect(case_.id); }}
                                    className="mt-1"
                                    aria-label={selected ? "Auswahl entfernen" : "Auswählen"}
                                  >
                                    {selected ? <CheckSquare className="w-5 h-5 text-blue-400" /> : <Square className="w-5 h-5 text-white/60" />}
                                  </button>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                      <h3 className="text-lg font-semibold text-white">{case_.sender_name}</h3>
                                      {getStatusBadge(case_.status)}
                                      {case_.deadline && reminderStatus && (
                                        <Badge className={`border-white/30 ${
                                          reminderStatus.type === 'overdue' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                          reminderStatus.type === 'urgent' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                          reminderStatus.type === 'scheduled' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                          'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                        }`}>
                                          <reminderStatus.icon className="w-3 h-3 mr-1" />
                                          {reminderStatus.type === 'overdue' ? `${reminderStatus.days} Tag(e) überfällig` :
                                           reminderStatus.type === 'urgent' ? `${reminderStatus.days} Tag(e) bis Frist` :
                                           reminderStatus.type === 'scheduled' ? `Erinnerung aktiv (${reminderStatus.days}T)` :
                                           reminderStatus.type === 'ready' ? `Erinnerung bereit (${reminderStatus.days}T)` :
                                           `${reminderStatus.days} Tag(e) bis Frist`}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="overflow-x-auto">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm min-w-[500px]">
                                        <div><p className="text-white/60 truncate">Fall-Nr.</p><p className="text-white font-medium truncate">{case_.case_number || '---'}</p></div>
                                        <div><p className="text-white/60 truncate">{t('preview.caseRefNo')}</p><p className="text-white font-medium truncate">{case_.reference_number}</p></div>
                                        {case_.amount && <div><p className="text-white/60">{t('preview.caseAmount')}</p><p className="text-white font-medium">{case_.amount}€</p></div>}
                                        <div><p className="text-white/60">Erstellt</p><p className="text-white font-medium">{formatSafeDate(case_.created_date)}</p></div>
                                        {case_.deadline && (
                                          <div className="md:col-span-2"><p className="text-white/60">Frist</p><p className="text-white font-medium">{formatSafeDate(case_.deadline)}</p></div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                                  {case_.deadline && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(ev) => { ev.stopPropagation(); handleScheduleReminder(case_.id); }}
                                      disabled={schedulingReminder === case_.id}
                                      className={`glass border-white/30 hover:glow transition-all duration-300 ${
                                        case_.reminder_jobs?.some(job => job.status === 'scheduled')
                                          ? 'text-green-400 border-green-400/30'
                                          : 'text-white'
                                      }`}
                                      title={case_.reminder_jobs?.some(job => job.status === 'scheduled')
                                        ? 'Erinnerung ist geplant und aktiv'
                                        : 'Erinnerung einrichten, um über Frist benachrichtigt zu werden'}
                                    >
                                      {schedulingReminder === case_.id ? (
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      ) : (
                                        <Bell className="w-4 h-4 mr-1" />
                                      )}
                                      Erinnerung
                                    </Button>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="glass text-white border-white/30 hover:glow transition-all duration-300"
                                    onClick={(ev) => { ev.stopPropagation(); moveToTrash([case_.id]); }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" /> In Papierkorb
                                  </Button>

                                  <Button
                                    size="sm"
                                    className="glass text-white border-white/30 hover:glow transition-all duration-300"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      try { sessionStorage.setItem('nav_case_id', case_.id); } catch (e) { console.error("Failed to set session storage:", e); }
                                      window.location.href = createPageUrl(`CaseDetails?case_id=${case_.id}`);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Fall öffnen
                                  </Button>
                                </div>

                              </div>

                              {/* Reminder Results */}
                              {result && (
                                <Alert className={`glass ${result.success ? 'border-green-500/50' : 'border-red-500/50'}`}>
                                  <div className="flex items-center gap-2">
                                    {result.success ? <CheckCircle className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                                    <AlertDescription className="text-white text-sm">
                                      {result.success
                                        ? `✅ Erinnerung geplant: ${result.scheduled || 1} Job(s) für ${formatSafeDate(result.reminder_date, 'dd.MM.yyyy HH:mm')}`
                                        : `❌ Fehler: ${result.error}`
                                      }
                                    </AlertDescription>
                                  </div>
                                </Alert>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="invoices">
                <div className="space-y-4">
                  {transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <CreditCard className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">{t('dashboard.noInvoices')}</p>
                    </div>
                  ) : (
                    transactions.map(trans => (
                      <Card key={trans.id} className="glass border-white/20">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-white">{trans.productName}</h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm mt-2">
                                <div><p className="text-white/60">Datum</p><p className="text-white font-medium">{formatSafeDate(trans.created_date)}</p></div>
                                <div><p className="text-white/60">Betrag</p><p className="text-white font-medium">{(trans.amount / 100).toFixed(2)} {trans.currency.toUpperCase()}</p></div>
                                <div><p className="text-white/60">Rechnungsnr.</p><p className="text-white font-medium">{trans.invoiceNumber || '---'}</p></div>
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              {trans.billingAddress ? (
                                <Button
                                  size="sm"
                                  className="glass text-white border-white/30 hover:glow"
                                  onClick={() => handleDownloadInvoice(trans.id)}
                                  disabled={isDownloading === trans.id}
                                >
                                  {isDownloading === trans.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin"/> : <Download className="w-4 h-4 mr-1"/>}
                                  Rechnung
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  className="glass text-white border-white/30 hover:glow"
                                  onClick={() => setEditingTransaction(trans)}
                                >
                                  <FileText className="w-4 h-4 mr-1"/>
                                  Rechnung erstellen
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
              <TabsContent value="completed">
                 <div className="space-y-4">
                  {archivedCases.length === 0 ? (
                    <div className="text-center py-12">
                      <Archive className="w-16 h-16 text-white/40 mx-auto mb-4" /><p className="text-white/60">{t('dashboard.noCompletedCases')}</p>
                    </div>
                  ) : (
                    archivedCases.map(case_ => (
                      <Card key={case_.id} className="glass border-white/20">
                         <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2"><h3 className="text-lg font-semibold text-white">{case_.sender_name}</h3>{getStatusBadge(case_.status)}</div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div><p className="text-white/60 truncate">Fall-Nr.</p><p className="text-white font-medium truncate">{case_.case_number || '---'}</p></div>
                                <div><p className="text-white/60">{t('preview.caseRefNo')}</p><p className="text-white font-medium">{case_.reference_number}</p></div>
                                {case_.amount && <div><p className="text-white/60">{t('preview.caseAmount')}</p><p className="text-white font-medium">{case_.amount}€</p></div>}
                                <div><p className="text-white/60">Abgeschlossen</p><p className="text-white font-medium">{formatSafeDate(case_.updated_date)}</p></div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="glass text-white border-white/30 hover:glow transition-all duration-300"><Download className="w-4 h-4 mr-1" />{t('dashboard.downloadButton')}</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="trash">
                <div className="space-y-4">
                  {trashedCases.length === 0 ? (
                    <div className="text-center py-12">
                      <Trash2 className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60">Keine Fälle im Papierkorb.</p>
                    </div>
                  ) : (
                    <>
                      {/* Bulkbar im Papierkorb */}
                      {selectedCaseIds.length > 0 && (
                        <div className="glass border-white/20 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-white/80 text-sm">{selectedCaseIds.length} ausgewählt</div>
                          <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" className="glass border-white/30 text-white" onClick={() => selectedCaseIds.forEach(id => restoreFromTrash(id))}>
                              <Undo2 className="w-4 h-4 mr-2" /> Wiederherstellen
                            </Button>
                            <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={() => deleteForever(selectedCaseIds)}>
                              Endgültig löschen
                            </Button>
                            <Button variant="ghost" className="text-white/70" onClick={clearSelection}>Auswahl aufheben</Button>
                          </div>
                        </div>
                      )}

                      {trashedCases.map(case_ => {
                        const selected = selectedCaseIds.includes(case_.id);
                        return (
                          <Card key={case_.id} className="glass border-white/20">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-grow">
                                  <button
                                    onClick={() => toggleSelect(case_.id)}
                                    className="mt-1"
                                    aria-label={selected ? "Auswahl entfernen" : "Auswählen"}
                                  >
                                    {selected ? <CheckSquare className="w-5 h-5 text-blue-400" /> : <Square className="w-5 h-5 text-white/60" />}
                                  </button>
                                  <div>
                                    <div className="flex items-center gap-3">
                                      <h3 className="text-lg font-semibold text-white">{case_.sender_name || 'Fall'}</h3>
                                      <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">Papierkorb</Badge>
                                    </div>
                                    <div className="text-white/60 text-sm mt-1">
                                      Gelöscht am: {case_.deleted_at ? new Date(case_.deleted_at).toLocaleString() : '—'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                                  <Button size="sm" variant="outline" className="glass text-white border-white/30" onClick={() => restoreFromTrash(case_.id)}>
                                    <Undo2 className="w-4 h-4 mr-1" /> Wiederherstellen
                                  </Button>
                                  <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={() => deleteForever([case_.id])}>
                                    Endgültig löschen
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}
