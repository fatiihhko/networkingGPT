import React, { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Building2, MapPin, Phone, Mail, Star, Trash2, Tag } from "lucide-react";
import type { Contact } from "./types";
import { classifyDistanceToIstanbul } from "@/utils/distance";

const degreeColor = (degree: number) => {
  if (degree >= 8) return "hsl(var(--closeness-green))";
  if (degree >= 5) return "hsl(var(--closeness-yellow))";
  return "hsl(var(--closeness-red))";
};

interface ContactCardProps {
  contact: Contact;
  index: number;
  degreeLevel: number;
  onDelete: (id: string) => void;
}

export const ContactCard = memo(({ contact, index, degreeLevel, onDelete }: ContactCardProps) => (
  <Card 
    className="modern-card p-6 hover-lift bounce-in group" 
    style={{ animationDelay: `${index * 0.05}s` }}
  >
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex-1">
        <div className="text-xl font-bold gradient-text group-hover:scale-105 transition-transform">
          {contact.first_name} {contact.last_name}
        </div>
        {contact.profession && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            <span>{contact.profession}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span 
          className="flex items-center gap-1 text-white font-medium rounded-full px-2 py-1 text-xs"
          style={{ 
            backgroundColor: degreeColor(contact.relationship_degree),
            boxShadow: `0 0 10px ${degreeColor(contact.relationship_degree)}40`
          }}
        >
          <Star className="h-3.5 w-3.5" />
          <span>{contact.relationship_degree}/10</span>
        </span>
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
          {degreeLevel}. derece
        </span>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              aria-label="Kişiyi sil" 
              className="hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="glass-dark">
            <AlertDialogHeader>
              <AlertDialogTitle className="gradient-text">Kişiyi sil</AlertDialogTitle>
              <AlertDialogDescription>
                {contact.first_name} {contact.last_name} ağınızdan kalıcı olarak silinecek. Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="hover-lift">Vazgeç</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => onDelete(contact.id)} 
                className="bg-destructive text-destructive-foreground hover:opacity-90 hover-lift"
              >
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>

    {/* Location */}
    <div className="mb-4 p-3 glass rounded-lg">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="font-medium">{contact.city || "-"}</span>
      </div>
      {(() => {
        const label = classifyDistanceToIstanbul(contact.city);
        const pretty: Record<string, string> = {
          "çok yakın": "Çok Yakın",
          "yakın": "Yakın", 
          "orta": "Orta",
          "uzak": "Uzak",
          "çok uzak": "Çok Uzak",
        };
        return label ? (
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
            {pretty[label]}
          </span>
        ) : null;
      })()}
    </div>

    {/* Services */}
    {contact.services?.length ? (
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm font-medium mb-2">
          <Tag className="h-4 w-4 text-primary" />
          <span>Yapabilecekleri</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {contact.services.map((service, i) => (
            <span key={i} className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
              {service}
            </span>
          ))}
        </div>
      </div>
    ) : null}

    {/* Tags */}
    {contact.tags?.length ? (
      <div className="mb-4">
        <div className="text-sm font-medium mb-2">Özellikler</div>
        <div className="flex flex-wrap gap-1">
          {contact.tags.map((t, i) => (
            <span key={i} className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
              {t}
            </span>
          ))}
        </div>
      </div>
    ) : null}

    {/* Contact info */}
    <div className="mb-4 p-3 glass rounded-lg">
      <div className="grid gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          <span>{contact.phone || "-"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <span>{contact.email || "-"}</span>
        </div>
      </div>
    </div>

    {/* Description */}
    {contact.description ? (
      <div className="p-3 glass rounded-lg">
        <div className="text-sm italic text-muted-foreground">
          "{contact.description}"
        </div>
      </div>
    ) : null}
  </Card>
));

ContactCard.displayName = "ContactCard";