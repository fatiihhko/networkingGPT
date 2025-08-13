import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { 
  UserPlus, 
  Upload, 
  Link as LinkIcon,
  Building2,
  Heart,
  Home,
  MoreHorizontal,
  X
} from 'lucide-react';
import { useNetworkStore } from '@/store/network';
import { getCategoryColor } from '@/utils/colorTokens';
import { toast } from '@/components/ui/use-toast';

interface AddPersonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: 'default' | 'quick';
  onSuccess?: (person: any) => void;
}

const categoryOptions = [
  { value: 'work', label: 'İş', icon: Building2, color: 'bg-blue-500' },
  { value: 'family', label: 'Aile', icon: Home, color: 'bg-rose-500' },
  { value: 'friend', label: 'Arkadaş', icon: Heart, color: 'bg-green-500' },
  { value: 'other', label: 'Diğer', icon: MoreHorizontal, color: 'bg-slate-500' },
];

export const AddPersonModal = ({ 
  open, 
  onOpenChange, 
  variant = 'default',
  onSuccess 
}: AddPersonModalProps) => {
  const { addPerson } = useNetworkStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    avatarUrl: '',
    role: '',
    city: '',
    category: 'work' as const,
    closeness: 3 as const,
    email: '',
    phone: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Hata",
        description: "İsim alanı zorunludur.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const newPerson = await addPerson({
        name: formData.name.trim(),
        handle: formData.handle.trim() || undefined,
        avatarUrl: formData.avatarUrl.trim() || undefined,
        role: formData.role.trim() || undefined,
        city: formData.city.trim() || undefined,
        category: formData.category,
        closeness: formData.closeness,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        description: formData.description.trim() || undefined,
      });

      toast({
        title: "Başarılı",
        description: `${newPerson.name} başarıyla eklendi.`
      });

      // Reset form
      setFormData({
        name: '',
        handle: '',
        avatarUrl: '',
        role: '',
        city: '',
        category: 'work',
        closeness: 3,
        email: '',
        phone: '',
        description: '',
      });

      onSuccess?.(newPerson);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Hata",
        description: "Kişi eklenirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedCategory = categoryOptions.find(cat => cat.value === formData.category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass backdrop-blur-sm border-white/20 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {variant === 'quick' ? 'Hızlı Kişi Ekle' : 'Yeni Kişi Ekle'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <Avatar
                src={formData.avatarUrl}
                alt={formData.name || 'Preview'}
                fallback={formData.name || 'U'}
                size="xl"
                className="ring-2 ring-primary/20"
              />
            </div>
            
            <div className="flex-1 space-y-3">
              <div>
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="avatarUrl"
                    placeholder="https://example.com/avatar.jpg"
                    value={formData.avatarUrl}
                    onChange={(e) => handleInputChange('avatarUrl', e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Mock file upload - in real app, this would open file picker
                      const mockUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name || 'user'}`;
                      handleInputChange('avatarUrl', mockUrl);
                    }}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">İsim *</Label>
              <Input
                id="name"
                placeholder="Ad Soyad"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="handle">Kullanıcı Adı</Label>
              <Input
                id="handle"
                placeholder="@kullaniciadi"
                value={formData.handle}
                onChange={(e) => handleInputChange('handle', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="role">Rol/Pozisyon</Label>
              <Input
                id="role"
                placeholder="Örn: Frontend Developer"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="city">Şehir</Label>
              <Input
                id="city"
                placeholder="İstanbul"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
              />
            </div>
          </div>

          {/* Category and Closeness */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Kategori</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {categoryOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = formData.category === option.value;
                  
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      className={`h-auto p-3 flex flex-col items-center gap-2 ${
                        isSelected ? option.color : 'bg-white/10 border-white/20 hover:bg-white/20'
                      }`}
                      onClick={() => handleInputChange('category', option.value)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{option.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Yakınlık Seviyesi</Label>
              <div className="mt-2 space-y-3">
                <Slider
                  value={[formData.closeness]}
                  onValueChange={(value) => handleInputChange('closeness', value[0])}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uzak (1)</span>
                  <Badge variant="secondary" className="text-xs">
                    {formData.closeness}/5
                  </Badge>
                  <span>Yakın (5)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+90 5XX XXX XX XX"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              placeholder="Kişi hakkında notlar..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview Card */}
          {formData.name && (
            <Card className="p-4 bg-white/5 border-white/10">
              <div className="flex items-center gap-3">
                <Avatar
                  src={formData.avatarUrl}
                  alt={formData.name}
                  fallback={formData.name}
                  size="lg"
                />
                <div className="flex-1">
                  <div className="font-semibold">{formData.name}</div>
                  {formData.role && (
                    <div className="text-sm text-muted-foreground">{formData.role}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {selectedCategory && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedCategory.label}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      Yakınlık: {formData.closeness}/5
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              İptal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Ekleniyor...' : 'Kişi Ekle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
