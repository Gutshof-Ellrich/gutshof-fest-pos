import { Product, useAppStore } from '@/store/useAppStore';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  cartQuantities: Record<string, number>;
}

const ProductGrid = ({ products, onAddToCart, cartQuantities }: ProductGridProps) => {
  const depositPerGlass = useAppStore((state) => state.depositPerGlass);
  const sortedProducts = [...products].sort((a, b) => a.sortOrder - b.sortOrder);

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <p className="text-lg">Bitte wählen Sie eine Kategorie</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {sortedProducts.map((product) => {
        const quantity = cartQuantities[product.id] || 0;
        return (
          <button
            key={product.id}
            onClick={() => onAddToCart(product)}
            className={`product-btn ${quantity > 0 ? 'product-btn-selected' : ''}`}
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            <div className="flex justify-between items-start">
              <span className="font-medium text-foreground">
                {product.name}
                {product.hasDeposit && <span className="text-amber-600 ml-1">🍷</span>}
              </span>
              {quantity > 0 && (
                <span className="ml-2 min-w-[28px] h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  {quantity}
                </span>
              )}
            </div>
            <div className="text-primary font-bold mt-2">
              {product.price.toFixed(2).replace('.', ',')} €
              {product.hasDeposit && (
                <span className="text-amber-600 text-sm font-normal ml-1">
                  + {depositPerGlass.toFixed(2).replace('.', ',')} € Pfand
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ProductGrid;
