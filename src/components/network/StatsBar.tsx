import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, MapPin, Briefcase, Gauge, TrendingUp } from "lucide-react";
import { normalizeCityForProvince } from "@/utils/distance";

interface Row { id: string; city: string | null; profession: string | null; relationship_degree: number }

export const StatsBar = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("contacts")
      .select("id, city, profession, relationship_degree");
    if (!error) setRows((data as Row[]) || []);
    setIsLoading(false);
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
  const cityCount = new Set(rows.map(r => normalizeCityForProvince(r.city)).filter(Boolean) as string[]).size;
  const professionCount = new Set(rows.map(r => r.profession?.trim().toLowerCase()).filter(Boolean) as string[]).size;
  const avg = total ? (rows.reduce((a, b) => a + (b.relationship_degree || 0), 0) / total).toFixed(1) : "0.0";

  const Item = ({ icon: Icon, label, value, delay = 0 }: { icon: any; label: string; value: string | number; delay?: number }) => (
    <div 
      className="stats-card hover-lift bounce-in" 
      style={{ animationDelay: `${delay * 0.1}s` }}
    >
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-full gradient-primary text-primary-foreground hover-scale">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground font-medium">{label}</div>
          {isLoading ? (
            <div className="h-6 w-16 shimmer rounded mt-1"></div>
          ) : (
            <div className="text-2xl font-bold leading-none gradient-text">{value}</div>
          )}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
      </div>
      
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
      <Item icon={Users} label="Toplam Kişi" value={total} delay={0} />
      <Item icon={MapPin} label="Şehir" value={cityCount} delay={1} />
      <Item icon={Briefcase} label="Meslek" value={professionCount} delay={2} />
      <Item icon={Gauge} label="Ort. Yakınlık" value={avg} delay={3} />
    </div>
  );
};
