import React, { useState, useEffect, useRef, useCallback } from 'react';
import { agentSDK } from '@/agents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, MessageCircle, Bot, User as UserIcon, Loader2, Plus, ExternalLink, Smartphone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLocalization } from '@/components/hooks/useLocalization';
import MessageBubble from '@/components/MessageBubble';
import { User } from '@/entities/User';
import { UploadFile } from '@/integrations/Core';

export default function Assistant() {
  const { t } = useLocalization();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [attachmentUrls, setAttachmentUrls] = useState([]);
  const attachInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const loadUser = useCallback(async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      console.log('User not logged in');
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const selectConversation = useCallback(async (conversation) => {
    setCurrentConversation(conversation);
    setMessages(conversation.messages || []);
  }, []);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const convs = await agentSDK.listConversations({
        agent_name: 'widerspruchAssistent'
      });
      setConversations(convs || []);
      
      // Auto-select most recent conversation or create new one
      if (convs && convs.length > 0) {
        const mostRecent = convs[0];
        await selectConversation(mostRecent);
      }
    } catch (error) {
      setError('Fehler beim Laden der Gespräche.');
    } finally {
      setIsLoading(false);
    }
  }, [selectConversation]);

  useEffect(() => {
    loadUser();
    loadConversations();
  }, [loadUser, loadConversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    let unsubscribe;
    if (currentConversation?.id) {
      unsubscribe = agentSDK.subscribeToConversation(currentConversation.id, (data) => {
        setMessages(data.messages || []);
      });
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentConversation?.id]);

  const createNewConversation = async () => {
    try {
      const conversation = await agentSDK.createConversation({
        agent_name: 'widerspruchAssistent',
        metadata: {
          name: `Beratung mit Paragraphen-Heini ${new Date().toLocaleDateString('de-DE')}`,
          description: 'Präzise Widerspruchs-Beratung mit Paragraphen-Heini'
        }
      });
      
      setConversations(prev => [conversation, ...prev]);
      setCurrentConversation(conversation);
      setMessages([]); // Start with an empty conversation
    } catch (error) {
      setError('Fehler beim Erstellen eines neuen Gesprächs.');
      console.error('Error creating conversation:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending || !currentConversation) return;

    setIsSending(true);
    setError('');

    try {
      await agentSDK.addMessage(currentConversation, {
        role: 'user',
        content: newMessage.trim(),
        file_urls: attachmentUrls
      });
      
      setNewMessage('');
      setAttachments([]);
      setAttachmentUrls([]);
    } catch (error) {
      setError('Fehler beim Senden der Nachricht.');
    } finally {
      setIsSending(false);
    }
  };

  const handleAttachFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const uploads = await Promise.all(files.map(async (file) => {
        const { file_url } = await UploadFile({ file });
        return { name: file.name, url: file_url };
      }));
      setAttachments(prev => [...prev, ...uploads.map(u => u.name)]);
      setAttachmentUrls(prev => [...prev, ...uploads.map(u => u.url)]);
    } catch (err) {
      setError('Fehler beim Hochladen der Datei(en).');
    } finally {
      try { e.target.value = null; } catch {}
    }
  };

  const quickActions = [
    {
      label: 'Fallstatus',
      message: 'Wie ist der Status von Fall W24-XXXX? (Bitte Fall-Nummer einsetzen)'
    },
    {
      label: 'Frist prüfen',
      message: 'Was ist die Frist für Fall W24-XXXX? (Bitte Fall-Nummer einsetzen)'
    },
    {
      label: 'Widerspruch erstellen',
      message: 'Erstelle bitte einen Widerspruch für Fall W24-XXXX. (Bitte Fall-Nummer einsetzen)'
    },
    {
      label: 'Website-Hilfe',
      message: 'Ich habe ein Problem mit der Website. Können Sie mir bei den Funktionen helfen?'
    }
  ];

  const handleQuickAction = (message) => {
    setNewMessage(message);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="glass rounded-3xl p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
            <p className="text-white">Lade persönlichen Assistenten...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="glass rounded-3xl p-8 mb-6">
            <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Paragraphen-Heini 📚⚖️</h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Ihr sarkastisch-präziser Widerspruchs-Assistent mit anwaltlichem Scharfsinn und einer Vorliebe für Details!
            </p>
          </div>
        </div>

        {error && (
          <Alert className="glass border-red-500/50 mb-6">
            <AlertDescription className="text-white">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Conversation List */}
          <div className="lg:col-span-1">
            <Card className="glass border-white/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Beratungen mit Heini
                  </CardTitle>
                  <Button
                    onClick={createNewConversation}
                    size="sm"
                    className="glass text-white border-white/30 hover:glow"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      currentConversation?.id === conv.id
                        ? 'bg-white/20 border border-white/30'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="text-white font-medium text-sm">
                      {conv.metadata?.name || 'Beratung mit Paragraphen-Heini'}
                    </div>
                    <div className="text-white/60 text-xs">
                      {conv.messages?.length || 0} Nachrichten
                    </div>
                  </div>
                ))}
                
                {conversations.length === 0 && (
                  <p className="text-white/60 text-sm text-center py-4">
                    Noch keine Beratungen mit Paragraphen-Heini
                  </p>
                )}
              </CardContent>
            </Card>

            {/* WhatsApp Integration */}
            <Card className="glass border-white/20 mt-6">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  WhatsApp Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 text-sm mb-3">
                  Nutzen Sie den Assistenten auch unterwegs via WhatsApp!
                </p>
                <a
                  href={agentSDK.getWhatsAppConnectURL('widerspruchAssistent')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full glass text-white border-white/30 hover:glow text-sm">
                    <Smartphone className="w-4 h-4 mr-2" />
                    WhatsApp öffnen
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="glass border-white/20 h-[70vh] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-white flex items-center gap-2">
                  <div className="w-8 h-8 glass rounded-full flex items-center justify-center">
                    <span className="text-lg">📚</span>
                  </div>
                  Paragraphen-Heini
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-auto">
                    Bereit für Präzision
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-grow flex flex-col p-0">
                {currentConversation ? (
                  <>
                    {/* Messages Area */}
                    <div className="flex-grow overflow-y-auto p-6 space-y-4">
                      {messages.length === 0 && (
                        <>
                          <MessageBubble message={{ 
                            role: 'assistant', 
                            content: '**Hallo! Paragraphen‑Heini hier. 📚⚖️**\n\nIch unterstütze Sie freundlich, bestimmt und rechtlich fundiert.\nNennen Sie mir am besten Ihre Fall‑Nummer (z. B. W24‑ABC123), dann kann ich:\n- Status und Fristen prüfen\n- einen rechtlich sauberen Briefentwurf (DIN 5008) mit aktuellen Rechtsgrundlagen erstellen\n- passende Aktionen auslösen (z. B. Widerspruch anlegen)\n\nNa, das kriegen wir hin :-)' 
                          }} />
                          <div className="grid gap-2 max-w-md mx-auto pt-4">
                            {quickActions.map((action, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                onClick={() => handleQuickAction(action.message)}
                                className="glass border-white/30 text-white hover:bg-white/10 text-sm"
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        </>
                      )}
                      
                      {messages.map((message, idx) => (
                        <MessageBubble key={idx} message={message} />
                      ))}
                      
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="flex-shrink-0 border-t border-white/10 p-6">
                      <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
                        <Button
                          type="button"
                          onClick={() => attachInputRef.current?.click()}
                          variant="outline"
                          className="glass border-white/30 text-white hover:bg-white/10"
                          disabled={isSending}
                          title="Dateien anhängen"
                        >
                          📎
                        </Button>
                        <input
                          ref={attachInputRef}
                          type="file"
                          multiple
                          onChange={handleAttachFiles}
                          className="hidden"
                        />
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Fragen Sie Paragraphen-Heini... (bitte präzise!)"
                          className="glass border-white/30 text-white placeholder-white/60"
                          disabled={isSending}
                        />
                        <Button
                          type="submit"
                          disabled={isSending || !newMessage.trim()}
                          className="glass text-white border-white/30 hover:glow"
                        >
                          {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </form>
                      {attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {attachments.map((name, idx) => (
                            <span key={idx} className="text-xs text-white/80 bg-white/10 px-2 py-1 rounded">
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-grow flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📚</div>
                      <h3 className="text-white text-lg mb-2">Paragraphen-Heini wartet...</h3>
                      <p className="text-white/60">Erstellen Sie eine neue Beratung oder wählen Sie eine bestehende aus.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}