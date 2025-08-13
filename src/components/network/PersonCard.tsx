import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Mail, 
  Phone, 
  Building2, 
  Heart, 
  Tag, 
  FileText,
  Edit,
  Trash2,
  Link,
  UserPlus,
  Crown
} from 'lucide-react';
import type { Person } from './types';

interface PersonCardProps {
  person: Person;
  variant: 'mini' | 'full';
  onEdit?: (person: Person) => void;
  onDelete?: (personId: string) => void;
  onConnect?: (personId: string) => void;
}

export const PersonCard = ({ 
  person, 
  variant, 
  onEdit, 
  onDelete, 
  onConnect 
}: PersonCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'work': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'family': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'friend': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'work': return <Building2 className="h-3 w-3" />;
      case 'family': return <Heart className="h-3 w-3" />;
      case 'friend': return <UserPlus className="h-3 w-3" />;
      default: return <Tag className="h-3 w-3" />;
    }
  };

  const getClosenessDots = (closeness?: number) => {
    const dots = [];
    const maxDots = 5;
    const filledDots = closeness || 3;
    
    for (let i = 0; i < maxDots; i++) {
      dots.push(
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < filledDots ? 'bg-primary' : 'bg-muted'
          }`}
        />
      );
    }
    return dots;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (variant === 'mini') {
    return (
      <Card 
        className="p-3 max-w-xs glass border shadow-lg"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={person.avatarUrl} />
            <AvatarFallback className="text-xs">
              {getInitials(person.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate">{person.name}</h4>
              {person.handle && (
                <span className="text-xs text-muted-foreground">@{person.handle}</span>
              )}
            </div>
            
            {person.role && (
              <div className="flex items-center gap-1 mb-1">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">{person.role}</span>
              </div>
            )}
            
            {person.city && (
              <div className="flex items-center gap-1 mb-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{person.city}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {getClosenessDots(person.closeness)}
              </div>
              <Badge 
                variant="outline" 
                className={`text-xs ${getCategoryColor(person.category)}`}
              >
                {getCategoryIcon(person.category)}
                <span className="ml-1">
                  {person.category === 'work' ? 'İş' : 
                   person.category === 'family' ? 'Aile' :
                   person.category === 'friend' ? 'Arkadaş' : 'Diğer'}
                </span>
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 glass border shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={person.avatarUrl} />
            <AvatarFallback className="text-sm">
              {getInitials(person.name)}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h3 className="font-semibold text-lg">{person.name}</h3>
            {person.handle && (
              <p className="text-sm text-muted-foreground">@{person.handle}</p>
            )}
          </div>
        </div>
        
        <div className="flex gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(person)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(person.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Role and Category */}
      <div className="flex items-center gap-2 mb-3">
        {person.role && (
          <Badge variant="secondary" className="text-xs">
            <Building2 className="h-3 w-3 mr-1" />
            {person.role}
          </Badge>
        )}
        <Badge 
          variant="outline" 
          className={`text-xs ${getCategoryColor(person.category)}`}
        >
          {getCategoryIcon(person.category)}
          <span className="ml-1">
            {person.category === 'work' ? 'İş' : 
             person.category === 'family' ? 'Aile' :
             person.category === 'friend' ? 'Arkadaş' : 'Diğer'}
          </span>
        </Badge>
      </div>

      {/* Contact Information */}
      <div className="space-y-2 mb-4">
        {person.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{person.email}</span>
          </div>
        )}
        
        {person.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{person.phone}</span>
          </div>
        )}
        
        {person.city && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{person.city}</span>
          </div>
        )}
      </div>

      <Separator className="my-3" />

      {/* Closeness */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Yakınlık</span>
          <span className="text-sm text-muted-foreground">
            {person.closeness || 3}/5
          </span>
        </div>
        <div className="flex gap-1">
          {getClosenessDots(person.closeness)}
        </div>
      </div>

      {/* Services */}
      {person.services && person.services.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Hizmetler</h4>
          <div className="flex flex-wrap gap-1">
            {person.services.map((service, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {service}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {person.tags && person.tags.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Etiketler</h4>
          <div className="flex flex-wrap gap-1">
            {person.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {person.description && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Notlar</h4>
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            {person.description}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {onConnect && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConnect(person.id)}
            className="flex-1"
          >
            <Link className="h-4 w-4 mr-2" />
            Bağlantı Ekle
          </Button>
        )}
      </div>

      {/* Created Date */}
      <div className="mt-3 text-xs text-muted-foreground">
        Eklenme: {new Date(person.createdAt).toLocaleDateString('tr-TR')}
      </div>
    </Card>
  );
};
