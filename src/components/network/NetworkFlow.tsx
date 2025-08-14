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

  // Recursive radial layout algorithm - every node places its children in a mini-orbit around itself
  const calculatePositions = (contacts: Contact[], containerWidth: number = 1400, containerHeight: number = 1200) => {
    const positions = new Map<string, { x: number; y: number }>();
    
    // Recursive radial layout configuration
    const CENTER_X = containerWidth / 2;
    const CENTER_Y = containerHeight / 2;
    const DEPTH_RING_STEP = 260; // Distance between depth rings (ΔR)
    const LOCAL_ORBIT_STEP = 160; // Distance for local orbits around each node (Δr)
    const MIN_ANGULAR_GAP = 15; // Minimum angular gap in degrees
    const MIN_RADIAL_GAP = 140; // Minimum distance between nodes
    const BASE_NODE_SIZE = 70; // Base node size for collision detection
    
    // Always position Rook Tech at the center
    positions.set("rook-tech", { x: CENTER_X, y: CENTER_Y });
    
    // Build parent-child relationships
    const parentChildMap = new Map<string, Contact[]>();
    
    // Initialize parent-child mapping
    parentChildMap.set("rook-tech", []);
    
    contacts.forEach(contact => {
      const parentId = contact.parent_contact_id || "rook-tech";
      
      if (!parentChildMap.has(parentId)) {
        parentChildMap.set(parentId, []);
      }
      parentChildMap.get(parentId)!.push(contact);
      
      if (!parentChildMap.has(contact.id)) {
        parentChildMap.set(contact.id, []);
      }
    });
    
    // Recursively position nodes starting from root
    const positionNodeAndChildren = (
      nodeId: string, 
      centerX: number, 
      centerY: number, 
      depth: number = 0,
      processedNodes = new Set<string>()
    ) => {
      if (processedNodes.has(nodeId)) return;
      processedNodes.add(nodeId);
      
      const children = parentChildMap.get(nodeId) || [];
      if (children.length === 0) return;
      
      // Calculate adaptive orbit radius based on:
      // 1. Number of children
      // 2. Minimum angular spacing requirements
      // 3. Node size considerations
      const childCount = children.length;
      let orbitRadius = LOCAL_ORBIT_STEP + (depth * 40); // Increase radius for deeper levels
      
      // Calculate minimum radius needed for proper angular spacing
      const minAngularRadians = (MIN_ANGULAR_GAP * Math.PI) / 180;
      const minCircumference = childCount * BASE_NODE_SIZE * 1.5; // Node size + padding
      const minRadiusForSpacing = minCircumference / (2 * Math.PI);
      
      // Use the larger of our base radius or minimum required radius
      orbitRadius = Math.max(orbitRadius, minRadiusForSpacing);
      
      // For nodes with many children, distribute across multiple concentric rings
      if (childCount > 10) {
        const maxChildrenPerRing = Math.min(8, Math.floor(2 * Math.PI / minAngularRadians));
        const ringsNeeded = Math.ceil(childCount / maxChildrenPerRing);
        
        for (let ring = 0; ring < ringsNeeded; ring++) {
          const ringStartIndex = ring * maxChildrenPerRing;
          const ringEndIndex = Math.min((ring + 1) * maxChildrenPerRing, childCount);
          const ringChildren = children.slice(ringStartIndex, ringEndIndex);
          const ringRadius = orbitRadius + (ring * LOCAL_ORBIT_STEP * 0.7);
          
          positionChildrenInOrbit(
            ringChildren,
            centerX,
            centerY,
            ringRadius,
            positions,
            processedNodes
          );
        }
      } else {
        // Single ring for smaller number of children
        positionChildrenInOrbit(
          children,
          centerX,
          centerY,
          orbitRadius,
          positions,
          processedNodes
        );
      }
      
      // Recursively position grandchildren around their parents
      children.forEach(child => {
        const childPos = positions.get(child.id);
        if (childPos) {
          positionNodeAndChildren(
            child.id,
            childPos.x,
            childPos.y,
            depth + 1,
            processedNodes
          );
        }
      });
    };
    
    // Helper function to position children in an orbit around their parent
    const positionChildrenInOrbit = (
      children: Contact[],
      centerX: number,
      centerY: number,
      radius: number,
      positions: Map<string, { x: number; y: number }>,
      processedNodes: Set<string>
    ) => {
      const childCount = children.length;
      if (childCount === 0) return;
      
      // For single child, position at 12 o'clock (top)
      if (childCount === 1) {
        const angle = -Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        const finalPos = resolveCollisions(
          children[0].id,
          x,
          y,
          radius,
          centerX,
          centerY,
          positions
        );
        
        positions.set(children[0].id, finalPos);
        return;
      }
      
      // Equal angular spacing for multiple children
      const angularStep = (2 * Math.PI) / childCount;
      const startAngle = -Math.PI / 2; // Start at 12 o'clock
      
      children.forEach((child, index) => {
        const angle = startAngle + (index * angularStep);
        let x = centerX + radius * Math.cos(angle);
        let y = centerY + radius * Math.sin(angle);
        
        const finalPos = resolveCollisions(
          child.id,
          x,
          y,
          radius,
          centerX,
          centerY,
          positions
        );
        
        positions.set(child.id, finalPos);
      });
    };
    
    // Collision detection and resolution
    const resolveCollisions = (
      nodeId: string,
      x: number,
      y: number,
      radius: number,
      centerX: number,
      centerY: number,
      positions: Map<string, { x: number; y: number }>
    ) => {
      let currentX = x;
      let currentY = y;
      let currentRadius = radius;
      let attempts = 0;
      const maxAttempts = 15;
      
      while (attempts < maxAttempts) {
        let hasCollision = false;
        
        // Check collision with existing nodes
        for (const [existingId, existingPos] of positions) {
          if (existingId !== nodeId) {
            const distance = Math.sqrt(
              Math.pow(currentX - existingPos.x, 2) + Math.pow(currentY - existingPos.y, 2)
            );
            
            if (distance < MIN_RADIAL_GAP) {
              hasCollision = true;
              break;
            }
          }
        }
        
        if (!hasCollision) {
          // Check bounds
          const padding = 120;
          if (currentX >= padding && currentX <= containerWidth - padding && 
              currentY >= padding && currentY <= containerHeight - padding) {
            return { x: currentX, y: currentY };
          }
        }
        
        // Resolve collision by increasing orbit radius
        currentRadius += 30;
        const angle = Math.atan2(currentY - centerY, currentX - centerX);
        currentX = centerX + currentRadius * Math.cos(angle);
        currentY = centerY + currentRadius * Math.sin(angle);
        attempts++;
      }
      
      return { x: currentX, y: currentY };
    };
    
    // Start recursive positioning from root
    positionNodeAndChildren("rook-tech", CENTER_X, CENTER_Y, 0);
    
    return positions;
  };

  const positions = useMemo(() => {
    // Use larger container for radial layout with orbits
    const containerWidth = Math.max(1600, window.innerWidth < 768 ? 1200 : 1800);
    const containerHeight = Math.max(1200, window.innerWidth < 768 ? 1000 : 1400);
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
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center mb-3 shadow-lg border-3 border-primary/30">
                <Crown className="h-10 w-10 text-primary-foreground" />
              </div>
              <div className="font-bold text-lg text-card-foreground">Rook Tech</div>
              <div className="text-sm text-muted-foreground">Ana Merkez</div>
            </div>
          ),
          contact: null,
          isRoot: true
        },
        position: positions.get("rook-tech") || { x: 800, y: 600 },
        style: { 
          background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--card) / 0.98))", 
          color: "hsl(var(--card-foreground))", 
          borderRadius: "28px", 
          padding: "0",
          border: "4px solid hsl(var(--primary) / 0.5)",
          boxShadow: "0 16px 48px hsl(var(--primary) / 0.3), 0 8px 24px hsl(var(--shadow) / 0.25)",
          minWidth: "180px",
          minHeight: "180px",
          backdropFilter: "blur(16px)"
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
         borderRadius: "24px",
         border: `3px solid ${relationshipColor}`,
         boxShadow: `0 12px 32px ${relationshipColor}30, 0 6px 16px hsl(var(--shadow) / 0.15)`,
         minWidth: "150px",
         minHeight: "150px",
         cursor: "pointer",
         backdropFilter: "blur(12px)"
       };

      nodeElements.push({
        id: contact.id,
        type: "default",
                  data: {
           label: (
             <Tooltip>
               <TooltipTrigger asChild>
                 <div className="flex flex-col items-center text-center p-5">
                   <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted to-muted/90 flex items-center justify-center mb-3 shadow-md border-2 border-border/40">
                     {hasChildren ? (
                       <Users className="h-7 w-7 text-primary" />
                     ) : (
                       <UserCheck className="h-7 w-7 text-muted-foreground" />
                     )}
                   </div>
                   <div className="font-semibold text-sm text-card-foreground mb-1 leading-tight text-center max-w-[130px]">
                     {contact.first_name} {contact.last_name}
                   </div>
                   {contact.profession && (
                     <div className="text-xs text-muted-foreground text-center max-w-[130px] truncate">
                       {contact.profession}
                     </div>
                   )}
                   {contact.city && (
                     <div className="text-xs text-muted-foreground/70 text-center max-w-[130px] truncate mt-1">
                       {contact.city}
                     </div>
                   )}
                   {hasChildren && (
                     <div className="text-xs text-primary/80 text-center mt-1 font-medium">
                       {networkContact.children.length} bağlantı
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
              opacity: 0.75,
              strokeDasharray: contact.relationship_degree >= 8 ? "0" : "6,3"
            },
            type: "bezier"
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
              opacity: 0.75,
              strokeDasharray: contact.relationship_degree >= 8 ? "0" : "6,3"
            },
            type: "bezier"
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
            opacity: 0.75,
            strokeDasharray: contact.relationship_degree >= 8 ? "0" : "6,3"
          },
          type: "bezier"
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
      
      <div className="w-full h-[700px] md:h-[900px] lg:h-[1100px] relative bg-gradient-to-br from-background via-background to-muted/20 rounded-xl overflow-hidden border border-border/50">
      {/* Modern Network Legend */}
       <div className="absolute top-6 left-6 z-10 bg-card/95 backdrop-blur-lg border border-border/50 rounded-xl p-4 text-xs shadow-lg">
         <div className="font-semibold mb-3 text-card-foreground">Radial Network</div>
         <div className="space-y-2">
           <div className="flex items-center gap-2">
             <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
               <Crown className="h-2 w-2 text-primary-foreground" />
             </div>
             <span className="text-muted-foreground">Center Root</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-4 h-4 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
               <Users className="h-2 w-2 text-primary" />
             </div>
             <span className="text-muted-foreground">Local Orbits</span>
           </div>
           <div className="h-px bg-border my-2"></div>
           <div className="flex items-center gap-2">
             <div className="w-4 h-px bg-gradient-to-r from-green-500 to-green-400"></div>
             <span className="text-muted-foreground">Strong (8-10)</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-4 h-px bg-gradient-to-r from-yellow-500 to-yellow-400 opacity-70" style={{strokeDasharray: "3,2"}}></div>
             <span className="text-muted-foreground">Medium (5-7)</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-4 h-px bg-gradient-to-r from-red-500 to-red-400 opacity-70" style={{strokeDasharray: "3,2"}}></div>
             <span className="text-muted-foreground">Weak (1-4)</span>
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
          fitViewOptions={{ padding: 0.15, includeHiddenNodes: false, minZoom: 0.05, maxZoom: 1.0 }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          minZoom={0.05}
          maxZoom={1.0}
          defaultViewport={{ x: 0, y: 0, zoom: 0.3 }}
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