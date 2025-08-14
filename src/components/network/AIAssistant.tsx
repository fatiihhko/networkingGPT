import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Users, Target, MessageCircle, Sparkles, Send } from "lucide-react";
import { useContacts } from "./ContactsContext";
import type { Contact } from "./types";

export const AIAssistant = () => {
  const { contacts } = useContacts();
  const [userMessage, setUserMessage] = useState("");
  const [chatState, setChatState] = useState<"waiting" | "asking" | "thinking" | "results">("waiting");
  const [teamRequirements, setTeamRequirements] = useState<{
    description: string;
    teamSize: number;
    skills: string[];
  } | null>(null);
  const [suggestedTeam, setSuggestedTeam] = useState<Contact[]>([]);

  const handleStartChat = () => {
    setChatState("asking");
  };

  const handleSendMessage = () => {
    if (!userMessage.trim()) return;
    
    setChatState("thinking");
    
    // Simulate AI processing
    setTimeout(() => {
      // Extract team requirements from user message
      const message = userMessage.toLowerCase().trim();
      
      // Extract team size
      const teamSizeMatch = message.match(/(\d+)\s*(kişi|kişilik|üye)/);
      const teamSize = teamSizeMatch ? parseInt(teamSizeMatch[1]) : 3;
      
      // Extract all meaningful keywords (3+ chars, not common words)
      const commonWords = ['için', 'bir', 'olan', 'var', 'ile', 'den', 'dan', 'lar', 'ler', 'nin', 'nın', 'nün', 'nun', 'kişi', 'kişilik', 'üye', 'ekip', 'team', 'proje', 'project'];
      const words = message
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length >= 3 && !commonWords.includes(word))
        .filter(word => !word.match(/^\d+$/)); // Remove pure numbers
      
      setTeamRequirements({
        description: userMessage,
        teamSize,
        skills: words
      });

      // Find contacts that match the keywords
      const scoredContacts = contacts.map(contact => {
        const contactData = [
          contact.first_name || "",
          contact.last_name || "",
          contact.profession || "",
          ...(contact.services || []),
          ...(contact.tags || []),
          contact.description || ""
        ].join(" ").toLowerCase();
        
        // Count keyword matches
        let matchScore = 0;
        words.forEach(keyword => {
          if (contactData.includes(keyword)) {
            matchScore += 1;
          }
        });
        
        return { contact, matchScore };
      });

      // Filter contacts with at least one match and sort by match score
      const finalTeam = scoredContacts
        .filter(item => item.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, teamSize)
        .map(item => item.contact);

      setSuggestedTeam(finalTeam);
      setChatState("results");
    }, 2000);
  };

  const resetChat = () => {
    setUserMessage("");
    setChatState("waiting");
    setTeamRequirements(null);
    setSuggestedTeam([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold gradient-text">Mehmet</h2>
        </div>
        <p className="text-muted-foreground">Merhaba! Ben Mehmet, senin AI ekip kurma asistanın 👋</p>
      </div>

      {/* Chat Interface */}
      <Card className="modern-card p-6">
        {chatState === "waiting" && (
          <div className="text-center space-y-4">
            <div className="text-lg">
              Merhaba! Sana perfect bir ekip kurmamda yardım edebilirim. 🚀
            </div>
            <div className="text-muted-foreground">
              Başlamak için aşağıdaki butona tıkla ve bana nasıl bir ekibe ihtiyacın olduğunu anlat!
            </div>
            <Button onClick={handleStartChat} className="mt-4">
              <MessageCircle className="h-4 w-4 mr-2" />
              Ekip Kurma Sohbetini Başlat
            </Button>
          </div>
        )}

        {chatState === "asking" && (
          <div className="space-y-4">
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Bot className="h-6 w-6 text-primary mt-1" />
                <div>
                  <div className="font-medium text-primary mb-2">Mehmet</div>
                  <div>
                    Süper! Şimdi bana şunları anlat: <br/><br/>
                    🎯 <strong>Nasıl bir ekibe ihtiyacın var?</strong> (Hangi proje için, ne yapacaksınız?)<br/>
                    👥 <strong>Kaç kişiden oluşan bir ekip istiyorsun?</strong><br/>
                    ⚡ <strong>Ekipte nasıl becerilere sahip kişiler olsun?</strong> (yazılım, tasarım, pazarlama vs.)<br/><br/>
                    
                    Ne kadar detay verirsen o kadar iyi bir ekip kurabilirim! 😊
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Textarea
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Örnek: Mobil uygulama geliştirmek için 4 kişilik bir ekibe ihtiyacım var. Yazılım geliştirici, UI/UX tasarımcı, pazarlama uzmanı ve proje yöneticisi olsun..."
                className="min-h-24"
              />
              <div className="flex gap-2">
                <Button onClick={handleSendMessage} disabled={!userMessage.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Ekip Kur
                </Button>
                <Button variant="outline" onClick={resetChat}>
                  İptal Et
                </Button>
              </div>
            </div>
          </div>
        )}

        {chatState === "thinking" && (
          <div className="text-center space-y-4 py-8">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div className="text-lg">Mehmet düşünüyor...</div>
            <div className="text-muted-foreground">
              Ağında bulunan {contacts.length} kişi arasından en uygun ekibi seçiyorum 🤔
            </div>
          </div>
        )}

        {chatState === "results" && teamRequirements && (
          <div className="space-y-6">
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Bot className="h-6 w-6 text-primary mt-1" />
                <div>
                  <div className="font-medium text-primary mb-2">Mehmet</div>
                  <div>
                    Harika! İstediğin ekibi analiz ettim. İşte sana özel olarak seçtiğim <strong>{teamRequirements.teamSize} kişilik ekip</strong>: 🎉
                    <br/><br/>
                    <strong>Proje:</strong> {teamRequirements.description}
                    {teamRequirements.skills.length > 0 && (
                      <>
                        <br/><strong>Aranan beceriler:</strong> {teamRequirements.skills.join(", ")}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {suggestedTeam.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Önerilen Ekip Üyeleri</h3>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  {suggestedTeam.map((contact, index) => (
                    <Card key={contact.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-bold text-lg">
                            {contact.first_name} {contact.last_name}
                          </div>
                          {contact.profession && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {contact.profession}
                            </div>
                          )}
                          {contact.city && (
                            <div className="text-xs text-muted-foreground mt-1">
                              📍 {contact.city}
                            </div>
                          )}
                          {contact.services?.length && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {contact.services.slice(0, 3).map((service, i) => (
                                <span key={i} className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
                                  {service}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">
                            {contact.relationship_degree}/10
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-green-800 dark:text-green-200 mb-1">
                        Mehmet'in Tavsiyesi
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">
                        Bu ekip üyeleri senin ağındaki en uygun kişiler! Ortalama bağlantı puanları yüksek ve istediklerin becerilere sahipler. 
                        Hemen onlarla iletişime geç ve projen için birlikte çalışmaya başlayın! 🚀
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <div className="text-muted-foreground mb-4">
                  Üzgünüm, ağında istediğin kriterlere uygun yeterli kişi bulamadım. 😔
                </div>
                <div className="text-sm text-muted-foreground">
                  Daha fazla kişi ekleyerek ağını genişletmeyi deneyebilirsin!
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={resetChat} variant="outline">
                <MessageCircle className="h-4 w-4 mr-2" />
                Yeni Ekip Kur
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};