import { Category } from '@/store/useAppStore';

interface CategoryGridProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  groupByType?: boolean;
}

// Legacy color map for backwards compatibility
const legacyColorMap: Record<string, string> = {
  'white-wine': '#D4A84B',
  'red-wine': '#722F37',
  'juice': '#E67E22',
  'water': '#3498DB',
  'beer': '#8B6914',
  'grill': '#27AE60',
  'sides': '#F1C40F',
};

// Determine if text should be light or dark based on background color
const getContrastColor = (hexColor: string): string => {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
};

// Get the actual color value (handles both hex and legacy names)
const getCategoryColor = (color: string): string => {
  if (color.startsWith('#')) {
    return color;
  }
  return legacyColorMap[color] || '#722F37';
};

// Generate gradient from base color
const getGradientStyle = (color: string): React.CSSProperties => {
  const baseColor = getCategoryColor(color);
  const textColor = getContrastColor(baseColor);
  
  // Parse the color to create a darker variant
  const hex = baseColor.replace('#', '');
  const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - 40);
  const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - 40);
  const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - 40);
  const darkerColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  
  return {
    background: `linear-gradient(135deg, ${baseColor}, ${darkerColor})`,
    color: textColor,
  };
};

const CategoryGrid = ({ categories, selectedCategoryId, onSelectCategory, groupByType = false }: CategoryGridProps) => {
  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  const renderCategoryButton = (category: Category) => (
    <button
      key={category.id}
      onClick={() => onSelectCategory(category.id)}
      className={`category-tile ${
        selectedCategoryId === category.id ? 'ring-4 ring-foreground/30 scale-[1.02]' : ''
      }`}
      style={getGradientStyle(category.color)}
    >
      <span className="relative z-10 break-words w-full">{category.name}</span>
    </button>
  );

  if (groupByType) {
    const drinkCategories = sortedCategories.filter(c => c.type === 'drinks');
    const foodCategories = sortedCategories.filter(c => c.type === 'food');

    return (
      <div className="space-y-6">
        {/* Drinks Section */}
        {drinkCategories.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
                Getränke
              </h3>
              <div className="flex-1 h-px bg-primary/20" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {drinkCategories.map(renderCategoryButton)}
            </div>
          </div>
        )}

        {/* Food Section */}
        {foodCategories.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-success" />
              <h3 className="text-sm font-semibold text-success uppercase tracking-wide">
                Speisen
              </h3>
              <div className="flex-1 h-px bg-success/20" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {foodCategories.map(renderCategoryButton)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {sortedCategories.map(renderCategoryButton)}
    </div>
  );
};

export default CategoryGrid;
