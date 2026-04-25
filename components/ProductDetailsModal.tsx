import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Product } from '@/hooks/useProducts';

export const ProductDetailsModal = ({ product, children }: { product: Product, children: React.ReactNode }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden sm:rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 shadow-2xl bg-white dark:bg-zinc-950 flex flex-col max-h-[85vh]">
        
        {/* Unified Soft Header */}
        <div className="px-8 pt-8 pb-6 relative shrink-0">
          {/* Subtle background gradient gleam */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-zinc-100/50 to-transparent dark:from-zinc-900/50 pointer-events-none" />
          
          <DialogHeader className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <DialogTitle className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {product.name}
              </DialogTitle>
              <Badge 
                variant={product.is_active ? "default" : "secondary"}
                className="rounded-full px-3 py-1 text-xs font-medium shadow-sm"
              >
                {product.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                Product ID
              </span>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md">
                {product._id}
              </span>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="px-8 pb-8 overflow-y-auto space-y-10 flex-1">
          
          {/* Image Gallery */}
          {product.images && product.images.length > 0 && (
            <section>
              <h4 className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
                Gallery
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {product.images.map((img, idx) => (
                  <div 
                    key={idx} 
                    className="group relative aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm"
                  >
                    <img 
                      src={img.image_url} 
                      alt={img.alt_text} 
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {/* Hover Tint Overlay */}
                    <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/5 dark:group-hover:bg-white/5 z-10" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Details & Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            
            {/* Left Column: Info */}
            <div className="md:col-span-3 space-y-8">
              <section>
                <h4 className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
                  Description
                </h4>
                <p className="text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {product.description}
                </p>
              </section>
              
              <section>
                <h4 className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
                  Slug URL
                </h4>
                <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50">
                  <code className="text-sm font-mono text-zinc-600 dark:text-zinc-400">
                    /{product.slug}
                  </code>
                </div>
              </section>
            </div>

            {/* Right Column: Metric Cards */}
            <div className="md:col-span-2 space-y-4">
              
              {/* Price Card */}
              <div className="relative overflow-hidden p-6 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/50 dark:to-zinc-950 shadow-sm transition-all hover:shadow-md group">
                {/* Subtle amber glow inside card */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl transition-all group-hover:bg-amber-500/20" />
                
                <h4 className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 relative z-10">
                  Base Price
                </h4>
                <div className="flex items-baseline gap-1 relative z-10">
                  <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    {product.base_price.toFixed(2)} dt
                  </span>
                  <span className="text-sm font-medium text-zinc-500">USD</span>
                </div>
              </div>

              {/* Inventory Card */}
              <div className="relative overflow-hidden p-6 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/50 dark:to-zinc-950 shadow-sm transition-all hover:shadow-md group">
                {/* Subtle blue glow inside card */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl transition-all group-hover:bg-blue-500/20" />
                
                <h4 className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 relative z-10">
                  Inventory
                </h4>
                <div className="flex items-baseline gap-1 relative z-10">
                  <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    {product.liquid_stock_quantity}
                  </span>
                  <span className="text-sm font-medium text-zinc-500">units</span>
                </div>
              </div>
              
            </div>
          </div>
        </div>

        {/* Soft Footer */}
        <div className="px-8 py-5 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20 flex justify-end shrink-0">
          <DialogClose asChild>
            <Button variant="outline" className="rounded-xl px-6 font-medium shadow-sm transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Close Panel
            </Button>
          </DialogClose>
        </div>

      </DialogContent>
    </Dialog>
  );
};