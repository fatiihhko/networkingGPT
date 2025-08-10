import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, MapPin, Briefcase, Gauge } from "lucide-react";

interface Row { id: string; city: string | null; profession: string | null; relationship_degree: number }

export const StatsBar = () => {
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    const { data, error } = await supabase
      .from("contacts")
      .select("id, city, profession, relationship_degree");
    if (!error) setRows((data as Row[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("contacts-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const total = rows.length;
  const cityCount = new Set(rows.map(r => r.city?.trim().toLowerCase()).filter(Boolean) as string[]).size;
  const professionCount = new Set(rows.map(r => r.profession?.trim().toLowerCase()).filter(Boolean) as string[]).size;
  const avg = total ? (rows.reduce((a, b) => a + (b.relationship_degree || 0), 0) / total).toFixed(1) : "0.0";

  const Item = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
    <Card className="flex items-center gap-3 p-4">
      <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold leading-none">{value}</div>
      </div>
    </Card>
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
      <Item icon={Users} label="Toplam Kişi" value={total} />
      <Item icon={MapPin} label="Şehir" value={cityCount} />
      <Item icon={Briefcase} label="Meslek" value={professionCount} />
      <Item icon={Gauge} label="Ort. Yakınlık" value={avg} />
    </div>
  );
};
