import { useState, useEffect } from 'react';
import { Sale, Product } from '../types';

interface Activity {
  id: string;
  type: 'sale' | 'stock_add' | 'product_add' | 'inventory_created';
  message: string;
  timestamp: Date;
  icon: string;
}

interface ActivityFeedProps {
  sales: Sale[];
  products: Product[];
  limit?: number;
}

export default function ActivityFeed({ sales, products, limit = 10 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const newActivities: Activity[] = [];
    
    sales.slice(0, 5).forEach(sale => {
      const product = products.find(p => p.id === sale.productId);
      newActivities.push({
        id: `sale-${sale.id}`,
        type: 'sale',
        message: `Sale: ${product?.name || 'Unknown'} - ${sale.quantity} units`,
        timestamp: new Date(sale.date),
        icon: '💰',
      });
    });
    
    products.slice(0, 3).forEach(product => {
      newActivities.push({
        id: `product-${product.id}`,
        type: 'product_add',
        message: `Product added: ${product.name}`,
        timestamp: new Date(),
        icon: '📦',
      });
    });
    
    newActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setActivities(newActivities.slice(0, limit));
  }, [sales, products, limit]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
        <span className="badge badge-neutral">{activities.length}</span>
      </div>
      
      <div className="space-y-2">
        {activities.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No recent activity</p>
        ) : (
          activities.map(activity => (
            <div key={activity.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-md transition-colors">
              <span className="text-lg">{activity.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{activity.message}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatTime(activity.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
