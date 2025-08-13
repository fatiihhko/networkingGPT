import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Contact } from "./types";
import { ReactFlow, Background, Controls, MiniMap, Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { classifyDistanceToIstanbul } from "@/utils/distance";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Mail, Phone, Building2, Users, Crown, UserCheck } from "lucide-react";
import { StatsBar } from "./StatsBar";

interface NetworkContact extends Contact {
  level: number;
  children: NetworkContact[];
  isRoot: boolean;
}

export const NetworkFlow = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const { data } = await supabase.from("contacts").select("*").order("created_at", { ascending: true });
      setContacts((data || []) as Contact[]);
      setIsLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("contacts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts" },
        async () => {
          const { data } = await supabase.from("contacts").select("*").order("created_at", { ascending: true });
          setContacts((data || []) as Contact[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Build hierarchical structure
  const networkStructure = useMemo(() => {
    const contactMap = new Map<string, NetworkContact>();
    const rootContacts: NetworkContact[] = [];

    // Initialize all contacts
    contacts.forEach(contact => {
      contactMap.set(contact.id, {
        ...contact,
        level: 0,
        children: [],
        isRoot: false
      });
    });

    // Build hierarchy
    contacts.forEach(contact => {
      const networkContact = contactMap.get(contact.id)!;
      
      if (contact.parent_contact_id) {
        // This contact was invited by someone - connect to inviter
        const parent = contactMap.get(contact.parent_contact_id);
        if (parent) {
          parent.children.push(networkContact);
          networkContact.level = parent.level + 1;
        } else {
          // Parent not found, treat as manually added (connect to Rook Tech)
          networkContact.level = 1;
        }
      } else {
        // This contact was manually added - connect to Rook Tech
        networkContact.level = 1;
      }
    });

    return { contactMap, rootContacts };
  }, [contacts]);

  // Calculate positions for hierarchical layout with Rook Tech as center
  const calculatePositions = (contacts: Contact[], startX: number, startY: number, levelHeight: number = 120) => {
    const positions = new Map<string, { x: number; y: number }>();
    
    // Rook Tech is always at center
    const centerX = 400;
    const centerY = 200;
    
    // Group contacts by level
    const levelGroups = new Map<number, Contact[]>();
    contacts.forEach(contact => {
      const level = contact.parent_contact_id ? 
        (networkStructure.contactMap.get(contact.parent_contact_id)?.level || 1) + 1 : 1;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(contact);
    });

    // Position contacts by level
    levelGroups.forEach((levelContacts, level) => {
      const y = centerY + (level * levelHeight);
      const totalWidth = levelContacts.length * 200;
      const startX = centerX - (totalWidth / 2) + 100;

      levelContacts.forEach((contact, index) => {
        const x = startX + (index * 200);
        positions.set(contact.id, { x, y });
      });
    });

    return positions;
  };

  const positions = useMemo(() => {
    return calculatePositions(contacts, 50, 50);
  }, [contacts, networkStructure]);

  const nodes = useMemo(() => {
    const nodeElements: Node[] = [];

    // Always add Rook Tech as the center root node
    nodeElements.push({
      id: "rook-tech",
      type: "default",
      data: { 
        label: (
          <div className="flex flex-col items-center text-center p-2">
            <Crown className="h-6 w-6 text-primary mb-1" />
            <div className="font-bold text-lg text-primary-foreground">Rook Tech</div>
            <div className="text-xs text-primary-foreground/80">Ana Merkez</div>
          </div>
        ),
        contact: null,
        isRoot: true
      },
      position: { x: 400, y: 200 },
      style: { 
        background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))", 
        color: "hsl(var(--primary-foreground))", 
        borderRadius: "16px", 
        padding: "16px",
        border: "3px solid hsl(var(--primary) / 0.3)",
        boxShadow: "0 0 20px hsl(var(--primary) / 0.3)",
        minWidth: "140px",
        minHeight: "100px"
      },
    });

    // Add contact nodes
    contacts.forEach((contact) => {
      const pos = positions.get(contact.id) || { x: 100, y: 100 };
      const networkContact = networkStructure.contactMap.get(contact.id)!;
      const isManuallyAdded = !contact.parent_contact_id;
      const hasChildren = networkContact.children.length > 0;
      
      const relationshipColor = contact.relationship_degree >= 8 ? "hsl(var(--closeness-green))" : 
                               contact.relationship_degree >= 5 ? "hsl(var(--closeness-yellow))" : 
                               "hsl(var(--closeness-red))";

             const nodeStyle = {
         padding: "8px",
         color: 'hsl(var(--card-foreground))',
         background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--card) / 0.8))",
         borderRadius: "12px",
         border: `2px solid ${relationshipColor}`,
         boxShadow: `0 4px 12px ${relationshipColor}30`,
         minWidth: "100px",
         minHeight: "60px",
         cursor: "pointer",
         transition: "all 0.3s ease"
       };

      nodeElements.push({
        id: contact.id,
        type: "default",
                 data: {
           label: (
             <Tooltip>
               <TooltipTrigger asChild>
                                   <div className="flex flex-col items-center text-center">
                    {hasChildren && <Users className="h-3 w-3 text-primary mb-1" />}
                    <div className="font-semibold text-xs text-card-foreground mb-1">
                      {contact.first_name} {contact.last_name}
                    </div>
                    {contact.profession && (
                      <div className="text-xs text-muted-foreground">
                        {contact.profession}
                      </div>
                    )}
                  </div>
               </TooltipTrigger>
                               <TooltipContent className="glass-dark max-w-xs">
                  <div className="space-y-2">
                    <div className="font-semibold">{contact.first_name} {contact.last_name}</div>
                    <div className="text-sm text-muted-foreground">E-posta: {contact.email || "-"}</div>
                    <div className="text-sm text-muted-foreground">Meslek: {contact.profession || "-"}</div>
                    <div className="text-sm text-muted-foreground">Şehir: {contact.city || "-"}</div>
                    <div className="text-sm text-muted-foreground">Telefon: {contact.phone || "-"}</div>
                    <div className="text-sm text-muted-foreground">Yakınlık: {contact.relationship_degree}/10</div>
                    <div className="text-sm text-muted-foreground">Seviye: {networkContact.level}</div>
                    {hasChildren && (
                      <div className="text-sm text-primary">Davet ettiği: {networkContact.children.length} kişi</div>
                    )}
                    {contact.services?.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Hizmetler: {contact.services.join(", ")}
                      </div>
                    )}
                    {contact.tags?.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Etiketler: {contact.tags.join(", ")}
                      </div>
                    )}
                  </div>
                </TooltipContent>
             </Tooltip>
           ),
           contact,
           isManuallyAdded,
           hasChildren
         },
        position: pos,
        style: nodeStyle,
      });
    });

    return nodeElements;
  }, [contacts, positions, networkStructure]);

  const edges = useMemo(() => {
    const edgeElements: Edge[] = [];
    
    contacts.forEach((contact) => {
      const relationshipColor = contact.relationship_degree >= 8 ? "hsl(var(--closeness-green))" : 
                               contact.relationship_degree >= 5 ? "hsl(var(--closeness-yellow))" : 
                               "hsl(var(--closeness-red))";
      
      if (contact.parent_contact_id) {
        // This contact was invited by someone - connect to inviter
        const parent = contacts.find(c => c.id === contact.parent_contact_id);
        if (parent) {
          edgeElements.push({
            id: `e-${contact.parent_contact_id}-${contact.id}`,
            source: contact.parent_contact_id,
            target: contact.id,
            animated: contact.relationship_degree >= 8,
            style: { 
              stroke: relationshipColor,
              strokeWidth: contact.relationship_degree >= 8 ? 3 : 2,
              opacity: 0.8
            },
            type: "smoothstep"
          });
        } else {
          // Parent not found, connect to Rook Tech
          edgeElements.push({
            id: `e-rook-tech-${contact.id}`,
            source: "rook-tech",
            target: contact.id,
            animated: contact.relationship_degree >= 8,
            style: { 
              stroke: relationshipColor,
              strokeWidth: contact.relationship_degree >= 8 ? 3 : 2,
              opacity: 0.8
            },
            type: "smoothstep"
          });
        }
      } else {
        // This contact was manually added - connect to Rook Tech
        edgeElements.push({
          id: `e-rook-tech-${contact.id}`,
          source: "rook-tech",
          target: contact.id,
          animated: contact.relationship_degree >= 8,
          style: { 
            stroke: relationshipColor,
            strokeWidth: contact.relationship_degree >= 8 ? 3 : 2,
            opacity: 0.8
          },
          type: "smoothstep"
        });
      }
    });

    return edgeElements;
  }, [contacts]);

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    if (node.data && 'contact' in node.data && node.data.contact) {
      setSelectedContact(node.data.contact as Contact);
      setShowDetails(true);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[420px] md:h-[560px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="loading-spinner mx-auto"></div>
          <p className="text-muted-foreground">Ağ haritası yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar - Görsel Ağ Haritası'nın üstünde */}
      <Card className="modern-card p-4 hover-lift">
        <StatsBar />
      </Card>
      
      <div className="w-full h-[420px] md:h-[560px] relative">
             {/* Network Legend */}
       <div className="absolute top-4 left-4 z-10 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 text-xs">
         <div className="font-semibold mb-2">Ağ Haritası Açıklaması</div>
         <div className="space-y-1">
                       <div className="flex items-center gap-2">
              <Crown className="h-3 w-3 text-primary" />
              <span>Rook Tech (Ana Merkez)</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 text-primary" />
              <span>Davet eden kullanıcı</span>
            </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-0.5 bg-green-500"></div>
             <span>Güçlü bağlantı (8-10/10)</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-0.5 bg-yellow-500"></div>
             <span>Orta bağlantı (5-7/10)</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-0.5 bg-red-500"></div>
             <span>Zayıf bağlantı (1-4/10)</span>
           </div>
         </div>
       </div>

      <TooltipProvider delayDuration={200}>
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          onNodeClick={handleNodeClick}
          fitView
          className="modern-card"
          fitViewOptions={{ padding: 0.2 }}
        >
          <MiniMap 
            style={{ 
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            nodeColor="hsl(var(--primary))"
          />
          <Controls 
            style={{ 
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Background 
            color="hsl(var(--muted-foreground) / 0.2)"
            gap={20}
            size={1}
          />
                </ReactFlow>
      </TooltipProvider>

             {/* Network Statistics */}
       <div className="absolute bottom-4 left-4 z-10 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 text-xs">
         <div className="font-semibold mb-2">Ağ İstatistikleri</div>
         <div className="space-y-1">
                       <div>Toplam Kişi: {contacts.length}</div>
            <div>Davet ile Eklenen: {contacts.filter(c => c.parent_contact_id).length}</div>
            <div>Bağlantı Sayısı: {edges.length}</div>
            <div>Maksimum Seviye: {contacts.length > 0 ? 
              Math.max(...contacts.map(c => networkStructure.contactMap.get(c.id)?.level || 0)) : '0'}
            </div>
         </div>
       </div>

      {/* Details Panel */}
       {showDetails && selectedContact && (
         <div className="absolute top-4 right-4 w-80 network-details-panel rounded-lg p-4 max-h-[calc(100%-2rem)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg gradient-text">
              {selectedContact.first_name} {selectedContact.last_name}
            </h3>
            <button 
              onClick={() => setShowDetails(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{selectedContact.email || "E-posta yok"}</span>
            </div>
            
            {selectedContact.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{selectedContact.phone}</span>
              </div>
            )}
            
            {selectedContact.city && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{selectedContact.city}</span>
              </div>
            )}
            
            {selectedContact.profession && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{selectedContact.profession}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Yakınlık Derecesi:</span>
              <Badge variant="outline">
                {selectedContact.relationship_degree}/10
              </Badge>
            </div>
            
            {selectedContact.services?.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Hizmetler</div>
                <div className="flex flex-wrap gap-1">
                  {selectedContact.services.map((service, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {selectedContact.tags?.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Etiketler</div>
                <div className="flex flex-wrap gap-1">
                  {selectedContact.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {selectedContact.description && (
              <div>
                <div className="text-sm font-medium mb-2">Notlar</div>
                <div className="text-sm bg-muted/50 p-3 rounded-lg">
                  {selectedContact.description}
                </div>
              </div>
            )}
          </div>
        </div>
       )}
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="glass-dark max-w-md">
          <DialogHeader>
            <DialogTitle className="gradient-text">
              {selectedContact?.first_name} {selectedContact?.last_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedContact && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{selectedContact.email || "E-posta yok"}</span>
              </div>
              
              {selectedContact.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedContact.phone}</span>
                </div>
              )}
              
              {selectedContact.city && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedContact.city}</span>
                </div>
              )}
              
              {selectedContact.profession && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedContact.profession}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Yakınlık Derecesi:</span>
                <Badge variant="outline">
                  {selectedContact.relationship_degree}/10
                </Badge>
              </div>
              
              {selectedContact.services?.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Hizmetler</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedContact.services.map((service, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedContact.tags?.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Etiketler</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedContact.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedContact.description && (
                <div>
                  <div className="text-sm font-medium mb-2">Notlar</div>
                  <div className="text-sm bg-muted/50 p-3 rounded-lg">
                    {selectedContact.description}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};