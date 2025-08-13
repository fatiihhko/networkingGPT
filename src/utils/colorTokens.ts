// Color tokens for network categories
export const categoryColors = {
  work: {
    primary: "bg-blue-500",
    secondary: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    ring: "ring-blue-500/20",
    gradient: "from-blue-500 to-blue-600",
  },
  family: {
    primary: "bg-rose-500",
    secondary: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
    ring: "ring-rose-500/20",
    gradient: "from-rose-500 to-rose-600",
  },
  friend: {
    primary: "bg-green-500",
    secondary: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    ring: "ring-green-500/20",
    gradient: "from-green-500 to-green-600",
  },
  other: {
    primary: "bg-slate-500",
    secondary: "bg-slate-100 dark:bg-slate-900/30",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-800",
    ring: "ring-slate-500/20",
    gradient: "from-slate-500 to-slate-600",
  },
} as const;

export const closenessColors = {
  1: "bg-red-500",
  2: "bg-orange-500", 
  3: "bg-yellow-500",
  4: "bg-green-500",
  5: "bg-emerald-500",
} as const;

export const getCategoryColor = (category: keyof typeof categoryColors = "other") => {
  return categoryColors[category];
};

export const getClosenessColor = (closeness: keyof typeof closenessColors = 3) => {
  return closenessColors[closeness];
};

// Node styling based on category and state
export const getNodeStyles = (
  category: keyof typeof categoryColors = "other",
  isSelected = false,
  isFocused = false,
  isDimmed = false
) => {
  const baseColors = getCategoryColor(category);
  
  return {
    backgroundColor: isSelected 
      ? "bg-primary" 
      : isFocused 
        ? baseColors.primary
        : baseColors.secondary,
    borderColor: isSelected 
      ? "border-primary" 
      : baseColors.border,
    ringColor: isSelected 
      ? "ring-primary/50" 
      : baseColors.ring,
    opacity: isDimmed ? "opacity-20" : "opacity-100",
    scale: isSelected ? "scale-110" : "scale-100",
  };
};

// Link styling based on strength
export const getLinkStyles = (strength: number = 0.5, isHighlighted = false) => {
  const opacity = isHighlighted ? "opacity-80" : "opacity-60";
  const width = strength > 0.8 ? "w-1" : strength > 0.6 ? "w-0.5" : "w-px";
  
  return {
    opacity,
    width,
    color: strength > 0.8 
      ? "stroke-green-500" 
      : strength > 0.6 
        ? "stroke-yellow-500" 
        : "stroke-red-500",
  };
};
