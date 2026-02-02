import { Category } from '@/store/useAppStore';

interface CategoryGridProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  groupByType?: boolean;
}

const getCategoryTileClass = (color: string): string => {
  const colorMap: Record<string, string> = {
    'white-wine': 'category-tile-white-wine',
    'red-wine': 'category-tile-red-wine',
    'juice': 'category-tile-juice',
    'water': 'category-tile-water',
    'beer': 'category-tile-beer',
    'grill': 'category-tile-grill',
    'sides': 'category-tile-sides',
  };
  return colorMap[color] || 'category-tile-red-wine';
};

const CategoryGrid = ({ categories, selectedCategoryId, onSelectCategory, groupByType = false }: CategoryGridProps) => {
  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

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
              {drinkCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => onSelectCategory(category.id)}
                  className={`category-tile ${getCategoryTileClass(category.color)} ${
                    selectedCategoryId === category.id ? 'ring-4 ring-foreground/30 scale-[1.02]' : ''
                  }`}
                >
                  <span className="relative z-10 break-words w-full">{category.name}</span>
                </button>
              ))}
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
              {foodCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => onSelectCategory(category.id)}
                  className={`category-tile ${getCategoryTileClass(category.color)} ${
                    selectedCategoryId === category.id ? 'ring-4 ring-foreground/30 scale-[1.02]' : ''
                  }`}
                >
                  <span className="relative z-10 break-words w-full">{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {sortedCategories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={`category-tile ${getCategoryTileClass(category.color)} ${
            selectedCategoryId === category.id ? 'ring-4 ring-foreground/30 scale-[1.02]' : ''
          }`}
        >
          <span className="relative z-10 break-words w-full">{category.name}</span>
        </button>
      ))}
    </div>
  );
};

export default CategoryGrid;
