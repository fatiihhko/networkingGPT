import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  X, 
  Users, 
  Building2, 
  Heart, 
  Home,
  MoreHorizontal
} from 'lucide-react';
import { useNetworkStore } from '@/store/network';
import { getCategoryColor } from '@/utils/colorTokens';
import type { NetworkFilters } from './types';

const categoryConfig = {
  work: { label: 'İş', icon: Building2, color: 'bg-blue-500' },
  family: { label: 'Aile', icon: Home, color: 'bg-rose-500' },
  friend: { label: 'Arkadaş', icon: Heart, color: 'bg-green-500' },
  other: { label: 'Diğer', icon: MoreHorizontal, color: 'bg-slate-500' },
} as const;

export const FiltersBar = () => {
  const { filters, setFilters } = useNetworkStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCategoryToggle = useCallback((category: keyof typeof categoryConfig) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    
    setFilters({ categories: newCategories });
  }, [filters.categories, setFilters]);

  const handleClosenessChange = useCallback((value: number[]) => {
    setFilters({ closenessRange: [value[0], value[1]] as [number, number] });
  }, [setFilters]);

  const handleSearchChange = useCallback((value: string) => {
    setFilters({ searchTerm: value });
  }, [setFilters]);

  const clearFilters = useCallback(() => {
    setFilters({
      categories: [],
      closenessRange: [1, 5],
      searchTerm: '',
    });
  }, [setFilters]);

  const hasActiveFilters = filters.categories.length > 0 || 
    filters.closenessRange[0] !== 1 || 
    filters.closenessRange[1] !== 5 || 
    filters.searchTerm.length > 0;

  return (
    <Card className="glass backdrop-blur-sm border-white/20 p-3">
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="İsim, rol, şehir ara..."
            value={filters.searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 focus:bg-white/20"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const Icon = config.icon;
            const isActive = filters.categories.includes(key as keyof typeof categoryConfig);
            
            return (
              <Button
                key={key}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryToggle(key as keyof typeof categoryConfig)}
                className={`h-8 px-2 ${
                  isActive 
                    ? config.color 
                    : 'bg-white/10 border-white/20 hover:bg-white/20'
                }`}
              >
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Button>
            );
          })}
        </div>

        {/* Expand/Collapse Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 px-2 bg-white/10 border-white/20 hover:bg-white/20"
        >
          <Filter className="h-4 w-4" />
          {isExpanded ? 'Gizle' : 'Filtreler'}
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 bg-white/10 border-white/20 hover:bg-white/20"
          >
            <X className="h-4 w-4" />
            Temizle
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-white/20">
          <div className="space-y-3">
            {/* Closeness Range Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Yakınlık Seviyesi</label>
                <Badge variant="secondary" className="text-xs">
                  {filters.closenessRange[0]} - {filters.closenessRange[1]}
                </Badge>
              </div>
              <Slider
                value={filters.closenessRange}
                onValueChange={handleClosenessChange}
                max={5}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Uzak</span>
                <span>Yakın</span>
              </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-1">
                {filters.categories.map(category => (
                  <Badge key={category} variant="secondary" className="text-xs">
                    {categoryConfig[category].label}
                  </Badge>
                ))}
                {filters.searchTerm && (
                  <Badge variant="secondary" className="text-xs">
                    "{filters.searchTerm}"
                  </Badge>
                )}
                {(filters.closenessRange[0] !== 1 || filters.closenessRange[1] !== 5) && (
                  <Badge variant="secondary" className="text-xs">
                    Yakınlık: {filters.closenessRange[0]}-{filters.closenessRange[1]}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
