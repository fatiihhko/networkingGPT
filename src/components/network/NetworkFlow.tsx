import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Contact } from "./types";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { classifyDistanceToIstanbul } from "@/utils/distance";

export const NetworkFlow = () => {
  const [contacts, setContacts] = useState<(Contact & { parent_contact_id?: string | null })[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Contact | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("contacts").select("*");
      setContacts((data || []) as any);
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
          const { data } = await supabase.from("contacts").select("*");
          setContacts((data || []) as any);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const nodes = useMemo(() => {
    // Build children map for hierarchical layout
    const children = new Map<string, string[]>();
    children.set("admin", []);
    contacts.forEach((c) => {
      const parent = c.parent_contact_id ? String(c.parent_contact_id) : "admin";
      if (!children.has(parent)) children.set(parent, []);
      children.get(parent)!.push(c.id);
      if (!children.has(c.id)) children.set(c.id, []);
    });

    const dx = 220; // horizontal gap per depth
    const dy = 100; // vertical gap between leaves
    const positions = new Map<string, { x: number; y: number }>();
    let nextY = 0;

    const assign = (id: string, depth: number): number => {
      const kids = children.get(id) || [];
      if (kids.length === 0) {
        const y = nextY * dy;
        nextY += 1;
        positions.set(id, { x: depth * dx, y });
        return y;
      }
      const childYs = kids.map((kid) => assign(kid, depth + 1));
      const y = childYs.reduce((a, b) => a + b, 0) / childYs.length;
      positions.set(id, { x: depth * dx, y });
      return y;
    };

    assign("admin", 0);

    // Normalize to positive space with a margin
    let minX = Infinity, minY = Infinity;
    positions.forEach((p) => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); });
    const offsetX = 50 - (isFinite(minX) ? minX : 0);
    const offsetY = 50 - (isFinite(minY) ? minY : 0);

    const adminPos = positions.get("admin") || { x: 0, y: 0 };
    const adminNode = {
      id: "admin",
      data: { label: "Rook Tech" },
      position: { x: adminPos.x + offsetX, y: adminPos.y + offsetY },
      style: { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderRadius: 9999, padding: 20 },
    } as any;

    const contactNodes = contacts.map((c) => {
      const p = positions.get(c.id) || { x: dx, y: 0 };
      const kategori = classifyDistanceToIstanbul(c.city || "");
      return {
        id: c.id,
        data: {
          label: (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center text-center">
                  <div className="font-medium text-sm md:text-base text-card-foreground">{c.first_name} {c.last_name}</div>
                  <div className="text-xs text-muted-foreground">{c.profession || "-"}</div>
                  {kategori && (
                    <span className="mt-1 inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] md:text-xs text-secondary-foreground">
                      {kategori}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <div className="text-sm">{c.first_name} {c.last_name}</div>
                  <div className="text-xs text-muted-foreground">Meslek: {c.profession || "-"}</div>
                  <div className="text-xs text-muted-foreground">Şehir: {c.city || "-"}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        },
        position: { x: p.x + offsetX, y: p.y + offsetY },
        style: { padding: 8, color: 'hsl(var(--card-foreground))', background: 'hsl(var(--card))' },
      } as any;
    });

    return [adminNode, ...contactNodes];
  }, [contacts]);

  const edges = useMemo(() => contacts.map((c) => {
    const stroke = c.relationship_degree >= 8 ? "hsl(var(--closeness-green))" : c.relationship_degree >= 5 ? "hsl(var(--closeness-yellow))" : "hsl(var(--closeness-red))";
    const source = c.parent_contact_id ? String(c.parent_contact_id) : "admin";
    return { id: `e-${source}-${c.id}`, source, target: c.id, animated: c.relationship_degree >= 8, style: { stroke } } as any;
  }), [contacts]);

  return (
    <div className="w-full h-[420px] md:h-[560px]">
      <TooltipProvider delayDuration={200}>
        <ReactFlow nodes={nodes} edges={edges} onNodeClick={(_, node) => {
          const found = contacts.find(c => c.id === node.id);
          if (found) { setActive(found); setOpen(true); }
        }} fitView>
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{active ? `${active.first_name} ${active.last_name}` : ""}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-2 text-sm">
              <div>Şehir: {active.city || "-"}</div>
              <div>Meslek: {active.profession || "-"}</div>
              <div>Yakınlık: {active.relationship_degree}</div>
              <div>Hizmetler: {active.services?.length ? active.services.join(", ") : "-"}</div>
              <div>Özellikler: {active.tags?.length ? active.tags.join(", ") : "-"}</div>
              <div>Notlar: {active.description || "-"}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
