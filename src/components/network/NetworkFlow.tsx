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

  // Hierarchical tree layout algorithm with strict top-to-bottom positioning
  const calculatePositions = (contacts: Contact[], containerWidth: number = 1200, containerHeight: number = 900) => {
    const positions = new Map<string, { x: number; y: number }>();
    
    // Tree layout configuration
    const RANK_SEPARATION = 260; // Vertical spacing between levels
    const NODE_SEPARATION = 140; // Horizontal spacing between siblings
    const ROOT_Y = 80; // Top margin for root node
    const NODE_WIDTH = 140;
    const NODE_HEIGHT = 140;
    
    // Center position for root
    const centerX = containerWidth / 2;
    
    // Always position Rook Tech at the top center
    positions.set("rook-tech", { x: centerX, y: ROOT_Y });
    
    // Build hierarchical structure with levels
    const levelGroups = new Map<number, Contact[]>();
    const contactLevels = new Map<string, number>();
    
    // Assign levels to contacts
    contacts.forEach(contact => {
      let level = 1; // Start at level 1 (Rook Tech is level 0)
      
      if (contact.parent_contact_id) {
        const parentLevel = contactLevels.get(contact.parent_contact_id) || 0;
        level = parentLevel + 1;
      }
      
      contactLevels.set(contact.id, level);
      
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(contact);
    });
    
    // Process each level from top to bottom
    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
    
    sortedLevels.forEach(level => {
      const levelContacts = levelGroups.get(level)!;
      const y = ROOT_Y + (level * RANK_SEPARATION);
      
      // Group contacts by their parent for proper positioning
      const parentGroups = new Map<string, Contact[]>();
      
      levelContacts.forEach(contact => {
        const parentId = contact.parent_contact_id || "rook-tech";
        if (!parentGroups.has(parentId)) {
          parentGroups.set(parentId, []);
        }
        parentGroups.get(parentId)!.push(contact);
      });
      
      // Position each parent group
      const parentIds = Array.from(parentGroups.keys());
      
      if (parentIds.length === 1) {
        // Single parent group - center under parent
        const parentId = parentIds[0];
        const children = parentGroups.get(parentId)!;
        const parentPos = positions.get(parentId);
        
        if (parentPos) {
          positionChildrenUnderParent(children, parentPos, positions, NODE_SEPARATION);
        }
      } else {
        // Multiple parent groups - distribute across width
        const totalWidth = parentIds.length * 300; // Base width per parent group
        const startX = centerX - (totalWidth / 2);
        
        parentIds.forEach((parentId, groupIndex) => {
          const children = parentGroups.get(parentId)!;
          const groupCenterX = startX + (groupIndex * 300) + 150;
          
          // Position parent if not already positioned
          if (!positions.has(parentId) && parentId !== "rook-tech") {
            const parentLevel = contactLevels.get(parentId) || 0;
            const parentY = ROOT_Y + (parentLevel * RANK_SEPARATION);
            positions.set(parentId, { x: groupCenterX, y: parentY });
          }
          
          const parentPos = positions.get(parentId) || { x: groupCenterX, y: y - RANK_SEPARATION };
          positionChildrenUnderParent(children, parentPos, positions, NODE_SEPARATION);
        });
      }
    });
    
    // Helper function to position children under their parent
    function positionChildrenUnderParent(
      children: Contact[], 
      parentPos: { x: number; y: number }, 
      positions: Map<string, { x: number; y: number }>,
      separation: number
    ) {
      const childCount = children.length;
      
      if (childCount === 1) {
        // Single child - center under parent
        positions.set(children[0].id, { 
          x: parentPos.x, 
          y: parentPos.y + RANK_SEPARATION 
        });
      } else {
        // Multiple children - distribute horizontally under parent
        const totalWidth = (childCount - 1) * separation;
        const startX = parentPos.x - (totalWidth / 2);
        
        children.forEach((child, index) => {
          const x = startX + (index * separation);
          const y = parentPos.y + RANK_SEPARATION;
          
          // Ensure minimum spacing from other nodes
          let finalX = x;
          let attempt = 0;
          while (attempt < 10) {
            let hasCollision = false;
            for (const [existingId, existingPos] of positions) {
              if (existingId !== child.id) {
                const distance = Math.sqrt(
                  Math.pow(finalX - existingPos.x, 2) + 
                  Math.pow(y - existingPos.y, 2)
                );
                if (distance < NODE_SEPARATION) {
                  hasCollision = true;
                  finalX += NODE_SEPARATION * 0.5; // Adjust position
                  break;
                }
              }
            }
            if (!hasCollision) break;
            attempt++;
          }
          
          positions.set(child.id, { x: finalX, y });
        });
      }
    }
    
    return positions;
  };

  const positions = useMemo(() => {
    // Use larger container for hierarchical tree layout
    const containerWidth = Math.max(1400, window.innerWidth < 768 ? 1000 : 1600);
    const containerHeight = Math.max(1000, window.innerWidth < 768 ? 800 : 1200);
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
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center mb-3 shadow-lg border-2 border-primary/20">
                <Crown className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="font-bold text-base text-card-foreground">Rook Tech</div>
              <div className="text-sm text-muted-foreground">Ana Merkez</div>
            </div>
          ),
          contact: null,
          isRoot: true
        },
        position: positions.get("rook-tech") || { x: 700, y: 80 },
        style: { 
          background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--card) / 0.98))", 
          color: "hsl(var(--card-foreground))", 
          borderRadius: "24px", 
          padding: "0",
          border: "3px solid hsl(var(--primary) / 0.4)",
          boxShadow: "0 12px 40px hsl(var(--primary) / 0.25), 0 6px 20px hsl(var(--shadow) / 0.2)",
          minWidth: "160px",
          minHeight: "160px",
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
         minWidth: "140px",
         minHeight: "140px",
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
                   <div className="w-14 h-14 rounded-full bg-gradient-to-br from-muted to-muted/90 flex items-center justify-center mb-3 shadow-sm border-2 border-border/30">
                     {hasChildren ? (
                       <Users className="h-6 w-6 text-primary" />
                     ) : (
                       <UserCheck className="h-6 w-6 text-muted-foreground" />
                     )}
                   </div>
                   <div className="font-semibold text-sm text-card-foreground mb-1 leading-tight text-center max-w-[120px]">
                     {contact.first_name} {contact.last_name}
                   </div>
                   {contact.profession && (
                     <div className="text-xs text-muted-foreground text-center max-w-[120px] truncate">
                       {contact.profession}
                     </div>
                   )}
                   {contact.city && (
                     <div className="text-xs text-muted-foreground/80 text-center max-w-[120px] truncate mt-1">
                       {contact.city}
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
              opacity: 0.7,
              strokeDasharray: contact.relationship_degree >= 8 ? "0" : "8,4"
            },
            type: "step"
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
              opacity: 0.7,
              strokeDasharray: contact.relationship_degree >= 8 ? "0" : "8,4"
            },
            type: "step"
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
            opacity: 0.7,
            strokeDasharray: contact.relationship_degree >= 8 ? "0" : "8,4"
          },
          type: "step"
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
      
      <div className="w-full h-[600px] md:h-[800px] lg:h-[1000px] relative bg-gradient-to-br from-background via-background to-muted/20 rounded-xl overflow-hidden border border-border/50">
      {/* Modern Network Legend */}
       <div className="absolute top-6 left-6 z-10 bg-card/95 backdrop-blur-lg border border-border/50 rounded-xl p-4 text-xs shadow-lg">
         <div className="font-semibold mb-3 text-card-foreground">Hierarchical Tree</div>
         <div className="space-y-2">
           <div className="flex items-center gap-2">
             <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
               <Crown className="h-2 w-2 text-primary-foreground" />
             </div>
             <span className="text-muted-foreground">Root Node</span>
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
          fitViewOptions={{ padding: 0.1, includeHiddenNodes: false, minZoom: 0.1, maxZoom: 1.2 }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          minZoom={0.1}
          maxZoom={1.2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
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