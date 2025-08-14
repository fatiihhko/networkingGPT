import React, { useEffect, useMemo, useState, memo, useCallback } from "react";
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
import { NetworkFlowSkeleton } from "@/components/ui/loading-skeleton";

interface NetworkContact extends Contact {
  level: number;
  children: NetworkContact[];
  isRoot: boolean;
}

// Memoized contact tooltip component for better performance
const ContactTooltip = memo(({ contact, networkContact, hasChildren }: {
  contact: Contact;
  networkContact: NetworkContact;
  hasChildren: boolean;
}) => (
  <TooltipContent 
    className="glass-dark max-w-xs z-[10000] bg-popover/95 backdrop-blur-md border border-border/50 shadow-2xl"
    side="top"
    sideOffset={10}
  >
    <div className="space-y-2 relative z-[10000]">
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
));

const NetworkFlow = memo(() => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from("contacts").select("*").order("created_at", { ascending: true });
    setContacts((data || []) as Contact[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    const channel = supabase
      .channel("contacts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts" },
        loadContacts
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadContacts]);

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

  // Layout algorithm that positions contacts close to their inviter with no overlaps
  const calculatePositions = (contacts: Contact[], containerWidth: number = 800, containerHeight: number = 560) => {
    const positions = new Map<string, { x: number; y: number }>();
    
    // Responsive center calculations
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    // Always position Rook Tech at the center
    positions.set("rook-tech", { x: centerX, y: centerY });
    
    // Group contacts by their parent/inviter
    const contactsByParent = new Map<string, Contact[]>();
    const manuallyAdded: Contact[] = [];
    
    contacts.forEach(contact => {
      if (contact.parent_contact_id) {
        if (!contactsByParent.has(contact.parent_contact_id)) {
          contactsByParent.set(contact.parent_contact_id, []);
        }
        contactsByParent.get(contact.parent_contact_id)!.push(contact);
      } else {
        manuallyAdded.push(contact);
      }
    });

    // Spacing constants - balanced for close positioning without overlap
    const baseRadius = Math.min(containerWidth, containerHeight) * 0.3;
    const childRadius = 90; // Closer distance from parent for invited contacts
    const minNodeSpacing = 130; // Reduced but still safe minimum distance
    const nodeSize = 120; // Node size including padding
    const padding = 120;

    // First, position manually added contacts around Rook Tech
    if (manuallyAdded.length > 0) {
      const angleStep = (2 * Math.PI) / manuallyAdded.length;
      manuallyAdded.forEach((contact, index) => {
        const angle = index * angleStep;
        let x = centerX + baseRadius * Math.cos(angle);
        let y = centerY + baseRadius * Math.sin(angle);
        
        // Ensure within bounds
        x = Math.max(padding, Math.min(containerWidth - padding, x));
        y = Math.max(padding, Math.min(containerHeight - padding, y));
        
        positions.set(contact.id, { x, y });
      });
    }

    // Enhanced collision detection for positioning children around parent
    const positionChildrenAroundParent = (parentId: string, children: Contact[]) => {
      const parentPos = positions.get(parentId);
      if (!parentPos || children.length === 0) return;

      // Determine parent's direction from center
      const directionX = parentPos.x - centerX;
      const directionY = parentPos.y - centerY;
      const parentAngle = Math.atan2(directionY, directionX);
      
      // Calculate adaptive radius based on number of children
      const adaptiveRadius = childRadius + Math.max(0, (children.length - 3) * 15);
      
      // Position children in the same direction as parent relative to center
      const baseAngle = parentAngle; // Start from parent's direction
      const angleSpread = Math.PI / 3; // 60 degrees spread
      const angleStep = children.length > 1 ? angleSpread / (children.length - 1) : 0;
      const startAngle = baseAngle - angleSpread / 2;
      
      children.forEach((child, index) => {
        let positioned = false;
        let attempts = 0;
        const maxAttempts = 20; // Increased attempts
        
        while (!positioned && attempts < maxAttempts) {
          // Calculate position based on parent's direction from center
          const angle = startAngle + (index * angleStep) + (attempts * 0.1);
          const distance = adaptiveRadius + (attempts * 20);
          
          let x = parentPos.x + distance * Math.cos(angle);
          let y = parentPos.y + distance * Math.sin(angle);
          
          // Ensure within bounds with larger padding
          x = Math.max(padding, Math.min(containerWidth - padding, x));
          y = Math.max(padding, Math.min(containerHeight - padding, y));
          
          // Comprehensive collision detection
          let hasCollision = false;
          for (const [existingId, existingPos] of positions) {
            const dist = Math.sqrt(Math.pow(x - existingPos.x, 2) + Math.pow(y - existingPos.y, 2));
            // Use node size + minimum spacing for more accurate collision detection
            if (dist < (minNodeSpacing + nodeSize / 2)) {
              hasCollision = true;
              break;
            }
          }
          
          if (!hasCollision) {
            positions.set(child.id, { x, y });
            positioned = true;
            
            // Recursively position this child's children around them
            const grandChildren = contactsByParent.get(child.id) || [];
            if (grandChildren.length > 0) {
              positionChildrenAroundParent(child.id, grandChildren);
            }
          }
          
          attempts++;
        }
        
        // Enhanced fallback positioning with spiral pattern
        if (!positioned) {
          let spiralAttempt = 0;
          const maxSpiralAttempts = 30;
          
          while (!positioned && spiralAttempt < maxSpiralAttempts) {
            const spiralAngle = startAngle + (index * angleStep) + (spiralAttempt * 0.3);
            const spiralDistance = adaptiveRadius + (spiralAttempt * 25);
            
            let x = parentPos.x + spiralDistance * Math.cos(spiralAngle);
            let y = parentPos.y + spiralDistance * Math.sin(spiralAngle);
            
            x = Math.max(padding, Math.min(containerWidth - padding, x));
            y = Math.max(padding, Math.min(containerHeight - padding, y));
            
            // Check collision again
            let hasCollision = false;
            for (const [existingId, existingPos] of positions) {
              const dist = Math.sqrt(Math.pow(x - existingPos.x, 2) + Math.pow(y - existingPos.y, 2));
              if (dist < (minNodeSpacing + nodeSize / 2)) {
                hasCollision = true;
                break;
              }
            }
            
            if (!hasCollision) {
              positions.set(child.id, { x, y });
              positioned = true;
              
              // Position grandchildren
              const grandChildren = contactsByParent.get(child.id) || [];
              if (grandChildren.length > 0) {
                positionChildrenAroundParent(child.id, grandChildren);
              }
            }
            
            spiralAttempt++;
          }
          
          // Ultimate fallback - force position at safe distance
          if (!positioned) {
            const safeAngle = index * angleStep;
            const safeDistance = adaptiveRadius + maxAttempts * 40;
            let x = parentPos.x + safeDistance * Math.cos(safeAngle);
            let y = parentPos.y + safeDistance * Math.sin(safeAngle);
            
            x = Math.max(padding, Math.min(containerWidth - padding, x));
            y = Math.max(padding, Math.min(containerHeight - padding, y));
            
            positions.set(child.id, { x, y });
            
            // Still try to position grandchildren
            const grandChildren = contactsByParent.get(child.id) || [];
            if (grandChildren.length > 0) {
              positionChildrenAroundParent(child.id, grandChildren);
            }
          }
        }
      });
    };

    // Position children around Rook Tech (manually added contacts)
    manuallyAdded.forEach(parent => {
      const children = contactsByParent.get(parent.id) || [];
      positionChildrenAroundParent(parent.id, children);
    });

    // Position children around other parents who might not be manually added
    contactsByParent.forEach((children, parentId) => {
      if (!positions.has(parentId)) {
        // Parent is not positioned yet, skip for now
        return;
      }
      // Children should already be positioned in the recursive call above
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
             <div className="relative z-[10000]">
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
                  <ContactTooltip 
                    contact={contact} 
                    networkContact={networkContact} 
                    hasChildren={hasChildren} 
                  />
               </Tooltip>
             </div>
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
      {/* Stats Bar - Hidden on mobile */}
      <Card className="modern-card p-4 hover-lift hidden md:block">
        <StatsBar />
      </Card>
      
      <div className="w-full h-[70vh] md:h-[700px] lg:h-[900px] relative bg-gradient-to-br from-background via-background to-muted/20 rounded-xl overflow-hidden border border-border/50">
      {/* Modern Network Legend - Hidden on mobile */}
       <div className="absolute top-6 left-6 z-10 bg-card/95 backdrop-blur-lg border border-border/50 rounded-xl p-4 text-xs shadow-lg hidden md:block">
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
            className="!w-32 !h-24 hidden md:block"
          />
          <Controls 
            style={{ 
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              boxShadow: '0 4px 12px hsl(var(--shadow) / 0.1)'
            }}
            showInteractive={false}
            className="hidden md:block"
          />
          <Background 
            color="hsl(var(--muted-foreground) / 0.1)"
            gap={24}
            size={0.8}
          />
        </ReactFlow>
      </TooltipProvider>

              {/* Modern Network Statistics - Hidden on mobile */}
       <div className="absolute bottom-4 left-4 z-10 bg-card/95 backdrop-blur-lg border border-border/50 rounded-xl p-4 text-xs shadow-lg hidden md:block">
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
});

export { NetworkFlow };