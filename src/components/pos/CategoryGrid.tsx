import { useAppStore, Category } from '@/store/useAppStore';

interface CategoryGridProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
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

const CategoryGrid = ({ categories, selectedCategoryId, onSelectCategory }: CategoryGridProps) => {
  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {sortedCategories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={`category-tile ${getCategoryTileClass(category.color)} ${
            selectedCategoryId === category.id ? 'ring-4 ring-foreground/30 scale-[1.02]' : ''
          }`}
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          <span className="relative z-10">{category.name}</span>
        </button>
      ))}
    </div>
  );
};

export default CategoryGrid;
