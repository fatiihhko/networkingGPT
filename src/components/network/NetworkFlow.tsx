import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Contact } from "./ContactList";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

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

  const nodes = useMemo(() => {
    const centerX = 350, centerY = 250;
    const adminNode = {
      id: "admin",
      data: { label: "Admin" },
      position: { x: centerX, y: centerY },
      style: { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderRadius: 9999, padding: 20 },
    } as any;
    const radius = 180;
    const others = contacts.map((c, i) => {
      const angle = (i / Math.max(contacts.length, 1)) * 2 * Math.PI;
      return {
        id: c.id,
        data: { label: `${c.first_name} ${c.last_name}` },
        position: { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius },
        style: { padding: 10 },
      } as any;
    });
    return [adminNode, ...others];
  }, [contacts]);

  const edges = useMemo(() => contacts.map((c) => {
    const stroke = c.relationship_degree >= 8 ? "hsl(var(--closeness-green))" : c.relationship_degree >= 5 ? "hsl(var(--closeness-yellow))" : "hsl(var(--closeness-red))";
    const source = c.parent_contact_id ? String(c.parent_contact_id) : "admin";
    return { id: `e-${source}-${c.id}`, source, target: c.id, animated: c.relationship_degree >= 8, style: { stroke } } as any;
  }), [contacts]);

  return (
    <div className="h-[480px] w-full">
      <ReactFlow nodes={nodes} edges={edges} onNodeClick={(_, node) => {
        const found = contacts.find(c => c.id === node.id);
        if (found) { setActive(found); setOpen(true); }
      }} fitView>
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{active ? `${active.first_name} ${active.last_name}` : ""}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-2 text-sm">
              <div>Şehir: {active.city || "-"}</div>
              <div>Yakınlık: {active.relationship_degree}</div>
              <div>Etiketler: {active.tags?.length ? active.tags.join(", ") : "-"}</div>
              <div>Hizmetler: {active.services?.length ? active.services.join(", ") : "-"}</div>
              <div>Açıklama: {active.description || "-"}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
