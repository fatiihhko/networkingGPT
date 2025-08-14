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

  // Advanced layout algorithm with dynamic spacing for professional network visualization
  const calculatePositions = (contacts: Contact[], containerWidth: number = 800, containerHeight: number = 560) => {
    const positions = new Map<string, { x: number; y: number }>();
    
    // Responsive center calculations
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    // Always position Rook Tech at the center
    positions.set("rook-tech", { x: centerX, y: centerY });
    
    // Group contacts by hierarchy level
    const levelGroups = new Map<number, Contact[]>();
    contacts.forEach(contact => {
      const level = contact.parent_contact_id ? 
        (networkStructure.contactMap.get(contact.parent_contact_id)?.level || 1) + 1 : 1;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(contact);
    });

    // Dramatically increased spacing for professional appearance
    const baseRadius = Math.min(containerWidth, containerHeight) * 0.25; // Increased from 0.3
    const levelIncrement = Math.max(180, Math.min(containerWidth, containerHeight) * 0.25); // Much larger spacing
    const minNodeSpacing = Math.max(200, containerWidth * 0.15); // Minimum 200px or 15% of container width
    const maxAttempts = 20;

    // Enhanced circular layout with collision avoidance
    levelGroups.forEach((levelContacts, level) => {
      const radius = baseRadius + (level - 1) * levelIncrement;
      const contactCount = levelContacts.length;
      
      if (contactCount === 1) {
        // Single node: place directly on circle
        const angle = Math.PI / 4; // 45 degrees for visual balance
        let x = centerX + radius * Math.cos(angle);
        let y = centerY + radius * Math.sin(angle);
        
        // Ensure within bounds
        const padding = 120;
        x = Math.max(padding, Math.min(containerWidth - padding, x));
        y = Math.max(padding, Math.min(containerHeight - padding, y));
        
        positions.set(levelContacts[0].id, { x, y });
        return;
      }

      // Multiple nodes: distribute evenly around circle with extra spacing
      const angleStep = (2 * Math.PI) / contactCount;
      const spacingMultiplier = Math.max(1.5, 3 - contactCount * 0.1); // Increase spacing for fewer nodes
      
      levelContacts.forEach((contact, index) => {
        let attempts = 0;
        let positioned = false;
        
        while (!positioned && attempts < maxAttempts) {
          // Calculate base position with spacing multiplier
          const baseAngle = index * angleStep * spacingMultiplier;
          const spreadRadius = radius + (attempts * 30); // Increase radius if collisions
          
          let x = centerX + spreadRadius * Math.cos(baseAngle);
          let y = centerY + spreadRadius * Math.sin(baseAngle);
          
          // Ensure nodes stay within bounds with generous padding
          const padding = 140;
          x = Math.max(padding, Math.min(containerWidth - padding, x));
          y = Math.max(padding, Math.min(containerHeight - padding, y));
          
          // Advanced collision detection with larger spacing
          let hasCollision = false;
          for (const [existingId, existingPos] of positions) {
            const distance = Math.sqrt(Math.pow(x - existingPos.x, 2) + Math.pow(y - existingPos.y, 2));
            if (distance < minNodeSpacing) {
              hasCollision = true;
              break;
            }
          }
          
          if (!hasCollision) {
            positions.set(contact.id, { x, y });
            positioned = true;
          } else {
            // Try alternative positions with increased radius and angle offset
            const offsetAngle = baseAngle + (attempts * 0.5);
            x = centerX + (spreadRadius + attempts * 40) * Math.cos(offsetAngle);
            y = centerY + (spreadRadius + attempts * 40) * Math.sin(offsetAngle);
            
            x = Math.max(padding, Math.min(containerWidth - padding, x));
            y = Math.max(padding, Math.min(containerHeight - padding, y));
            
            // Check collision again
            hasCollision = false;
            for (const [existingId, existingPos] of positions) {
              const distance = Math.sqrt(Math.pow(x - existingPos.x, 2) + Math.pow(y - existingPos.y, 2));
              if (distance < minNodeSpacing) {
                hasCollision = true;
                break;
              }
            }
            
            if (!hasCollision) {
              positions.set(contact.id, { x, y });
              positioned = true;
            }
          }
          
          attempts++;
        }
        
        // Fallback: force position if all attempts failed
        if (!positioned) {
          const fallbackAngle = index * angleStep + (Math.PI / 4);
          const fallbackRadius = radius + (attempts * 50);
          let x = centerX + fallbackRadius * Math.cos(fallbackAngle);
          let y = centerY + fallbackRadius * Math.sin(fallbackAngle);
          
          const padding = 140;
          x = Math.max(padding, Math.min(containerWidth - padding, x));
          y = Math.max(padding, Math.min(containerHeight - padding, y));
          
          positions.set(contact.id, { x, y });
        }
      });
    });

    return positions;
  };

  const positions = useMemo(() => {
    // Dynamic container sizing for optimal spacing
    const containerWidth = Math.max(1000, window.innerWidth < 768 ? 800 : 1200);
    const containerHeight = Math.max(800, window.innerWidth < 768 ? 600 : 900);
    return calculatePositions(contacts, containerWidth, containerHeight);
  }, [contacts, networkStructure]);

  const nodes = useMemo(() => {
    const nodeElements: Node[] = [];

    // Always add Rook Tech as the center root node
      nodeElements.push({
        id: "rook-tech",
        type: "default",
        data: { 
          label: (
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-2 shadow-lg">
                <Crown className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="font-bold text-sm text-card-foreground">Rook Tech</div>
              <div className="text-xs text-muted-foreground">Ana Merkez</div>
            </div>
          ),
          contact: null,
          isRoot: true
        },
        position: { x: positions.get("rook-tech")?.x || 600, y: positions.get("rook-tech")?.y || 450 },
        style: { 
          background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--card) / 0.98))", 
          color: "hsl(var(--card-foreground))", 
          borderRadius: "24px", 
          padding: "0",
          border: "3px solid hsl(var(--primary) / 0.4)",
          boxShadow: "0 12px 40px hsl(var(--primary) / 0.2), 0 6px 20px hsl(var(--shadow) / 0.15)",
          minWidth: "140px",
          minHeight: "140px",
          backdropFilter: "blur(12px)"
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
         padding: "0",
         color: 'hsl(var(--card-foreground))',
         background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--card) / 0.98))",
         borderRadius: "20px",
         border: `2px solid ${relationshipColor}`,
         boxShadow: `0 8px 28px ${relationshipColor}25, 0 4px 12px hsl(var(--shadow) / 0.12)`,
         minWidth: "120px",
         minHeight: "120px",
         cursor: "pointer",
         backdropFilter: "blur(10px)"
       };

      nodeElements.push({
        id: contact.id,
        type: "default",
                  data: {
           label: (
             <Tooltip>
               <TooltipTrigger asChild>
                 <div className="flex flex-col items-center text-center p-4">
                   <div className="w-12 h-12 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center mb-3 shadow-sm border border-border/20">
                     {hasChildren ? (
                       <Users className="h-5 w-5 text-primary" />
                     ) : (
                       <UserCheck className="h-5 w-5 text-muted-foreground" />
                     )}
                   </div>
                   <div className="font-semibold text-sm text-card-foreground mb-1 leading-tight text-center max-w-[100px]">
                     {contact.first_name} {contact.last_name}
                   </div>
                   {contact.profession && (
                     <div className="text-xs text-muted-foreground text-center max-w-[100px] truncate">
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
              opacity: 0.6,
              strokeDasharray: contact.relationship_degree >= 8 ? "0" : "8,4"
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
              opacity: 0.6,
              strokeDasharray: contact.relationship_degree >= 8 ? "0" : "8,4"
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
            opacity: 0.6,
            strokeDasharray: contact.relationship_degree >= 8 ? "0" : "8,4"
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
      
      <div className="w-full h-[500px] md:h-[700px] lg:h-[900px] relative bg-gradient-to-br from-background via-background to-muted/20 rounded-xl overflow-hidden border border-border/50">
      {/* Modern Network Legend */}
       <div className="absolute top-6 left-6 z-10 bg-card/95 backdrop-blur-lg border border-border/50 rounded-xl p-4 text-xs shadow-lg">
         <div className="font-semibold mb-3 text-card-foreground">Ağ Haritası</div>
         <div className="space-y-2">
           <div className="flex items-center gap-2">
             <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
               <Crown className="h-2 w-2 text-primary-foreground" />
             </div>
             <span className="text-muted-foreground">Ana Merkez</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-4 h-4 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
               <Users className="h-2 w-2 text-primary" />
             </div>
             <span className="text-muted-foreground">Davet Eden</span>
           </div>
           <div className="h-px bg-border my-2"></div>
           <div className="flex items-center gap-2">
             <div className="w-4 h-px bg-gradient-to-r from-green-500 to-green-400"></div>
             <span className="text-muted-foreground">Güçlü (8-10)</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-4 h-px bg-gradient-to-r from-yellow-500 to-yellow-400 opacity-70" style={{strokeDasharray: "2,2"}}></div>
             <span className="text-muted-foreground">Orta (5-7)</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-4 h-px bg-gradient-to-r from-red-500 to-red-400 opacity-70" style={{strokeDasharray: "2,2"}}></div>
             <span className="text-muted-foreground">Zayıf (1-4)</span>
           </div>
         </div>
       </div>

      <TooltipProvider delayDuration={200}>
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          onNodeClick={handleNodeClick}
          fitView
          className="w-full h-full"
          fitViewOptions={{ padding: 0.2, includeHiddenNodes: false, minZoom: 0.1, maxZoom: 1.5 }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          minZoom={0.1}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.4 }}
          preventScrolling={false}
          panOnDrag={true}
          zoomOnDoubleClick={false}
        >
          <MiniMap 
            style={{ 
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              boxShadow: '0 4px 12px hsl(var(--shadow) / 0.1)'
            }}
            nodeColor="hsl(var(--primary))"
            maskColor="hsl(var(--muted) / 0.8)"
            className="!w-32 !h-24"
          />
          <Controls 
            style={{ 
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              boxShadow: '0 4px 12px hsl(var(--shadow) / 0.1)'
            }}
            showInteractive={false}
          />
          <Background 
            color="hsl(var(--muted-foreground) / 0.1)"
            gap={24}
            size={0.8}
          />
        </ReactFlow>
      </TooltipProvider>

             {/* Modern Network Statistics */}
       <div className="absolute bottom-4 left-4 z-10 bg-card/95 backdrop-blur-lg border border-border/50 rounded-xl p-4 text-xs shadow-lg">
         <div className="font-semibold mb-3 text-card-foreground">İstatistikler</div>
         <div className="space-y-2">
           <div className="flex justify-between items-center">
             <span className="text-muted-foreground">Toplam:</span>
             <span className="font-medium text-card-foreground">{contacts.length}</span>
           </div>
           <div className="flex justify-between items-center">
             <span className="text-muted-foreground">Davetli:</span>
             <span className="font-medium text-card-foreground">{contacts.filter(c => c.parent_contact_id).length}</span>
           </div>
           <div className="flex justify-between items-center">
             <span className="text-muted-foreground">Bağlantı:</span>
             <span className="font-medium text-card-foreground">{edges.length}</span>
           </div>
           <div className="flex justify-between items-center">
             <span className="text-muted-foreground">Seviye:</span>
             <span className="font-medium text-card-foreground">{contacts.length > 0 ? 
               Math.max(...contacts.map(c => networkStructure.contactMap.get(c.id)?.level || 0)) : '0'}
             </span>
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
    </div>
  );
};