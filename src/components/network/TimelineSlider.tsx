import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Play, 
  Pause, 
  RotateCcw,
  Calendar
} from 'lucide-react';
import { useNetworkStore } from '@/store/network';

export const TimelineSlider = () => {
  const { people, timelineDate, setTimelineDate } = useNetworkStore();

  // Calculate date range
  const dateRange = useMemo(() => {
    if (people.length === 0) return { min: new Date(), max: new Date() };
    
    const dates = people.map(p => new Date(p.createdAt));
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return { min, max };
  }, [people]);

  // Convert timeline date to slider value (0-100)
  const sliderValue = useMemo(() => {
    if (!timelineDate) return 100;
    
    const timeline = new Date(timelineDate);
    const totalRange = dateRange.max.getTime() - dateRange.min.getTime();
    const timelinePosition = timeline.getTime() - dateRange.min.getTime();
    
    return Math.max(0, Math.min(100, (timelinePosition / totalRange) * 100));
  }, [timelineDate, dateRange]);

  // Convert slider value to date
  const handleSliderChange = (value: number[]) => {
    const sliderVal = value[0];
    const totalRange = dateRange.max.getTime() - dateRange.min.getTime();
    const timelinePosition = (sliderVal / 100) * totalRange;
    const newDate = new Date(dateRange.min.getTime() + timelinePosition);
    
    setTimelineDate(newDate.toISOString());
  };

  const resetTimeline = () => {
    setTimelineDate(null);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getVisibleCount = () => {
    if (!timelineDate) return people.length;
    return people.filter(p => new Date(p.createdAt) <= new Date(timelineDate)).length;
  };

  return (
    <Card className="glass border shadow-lg">
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Zaman Çizelgesi</span>
            <span className="text-xs text-muted-foreground">
              {getVisibleCount()}/{people.length} kişi
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={resetTimeline}
            className="h-6 w-6 p-0"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>

        {/* Date Range Display */}
        <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
          <span>{formatDate(dateRange.min)}</span>
          <span>{formatDate(dateRange.max)}</span>
        </div>

        {/* Slider */}
        <div className="mb-2">
          <Slider
            value={[sliderValue]}
            onValueChange={handleSliderChange}
            max={100}
            min={0}
            step={1}
            className="w-full"
          />
        </div>

        {/* Current Date Display */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {timelineDate ? formatDate(new Date(timelineDate)) : 'Tümü'}
            </span>
          </div>
          
          {timelineDate && (
            <span className="text-muted-foreground">
              {Math.round(sliderValue)}%
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
