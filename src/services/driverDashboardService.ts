import useAxios from '../hooks/useAxios';
import { useAuth } from '../context/AuthContext';

export interface DashboardOverview {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalEarnings: number;
  avgRating: number;
  totalRatings: number;
}

export interface OrderBreakdown {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  earnings: number;
}

export interface PerformanceMetrics {
  completionRate: number;
  cancellationRate: number;
  avgEarningsPerOrder: number;
  rating: {
    score: number;
    max: number;
    count: number;
  };
}

export interface RecentOrder {
  _id: string;
  orderId: string;
  type: 'food' | 'parcel';
  status: string;
  amount: number;
  totalAmount: number;
  ratedByCustomer: boolean;
  ratedDriver: boolean;
  customerName: string;
  createdAt: string;
  completedAt?: string;
}

export interface RecentRating {
  _id: string;
  rating: number;
  review: string;
  sourceModel: string;
  ratedBy: string;
  createdAt: string;
}

export interface DriverDashboard {
  driver: {
    _id: string;
    name: string;
    phone: string;
    driverID: string;
    isOnline: boolean;
  };
  overview: DashboardOverview;
  breakdown: {
    food: OrderBreakdown;
    parcel: OrderBreakdown;
  };
  performance: PerformanceMetrics;
  recentOrders: RecentOrder[];
  recentRatings: RecentRating[];
  meta: {
    dateFilter: string;
    dateRange: {
      from: string;
      to: string;
    };
  };
}

export interface EarningsStats {
  total: number;
  breakdown: {
    food: {
      total: number;
      orders: number;
      avgPerOrder: number;
    };
    parcel: {
      total: number;
      orders: number;
      avgPerOrder: number;
    };
  };
  allTimeTotal: number;
  range: string;
  dateRange: {
    from: string;
    to: string;
  };
}

export const useDriverDashboardService = () => {
  const { fetchData } = useAxios();
  const { token } = useAuth();

  /**
   * Fetch driver dashboard overview
   * @param filter - 'today' | 'this_week' | 'this_month' | 'all'
   */
  const getDashboard = async (filter: string = 'today'): Promise<DriverDashboard> => {
    try {
      const response = await fetchData({
        method: 'GET',
        url: '/driver/dashboard',
        params: { filter },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('[DashboardService] getDashboard error:', error);
      throw error;
    }
  };

  /**
   * Fetch detailed statistics
   * @param range - 'today' | 'this_week' | 'this_month' | 'all'
   */
  const getStatistics = async (range: string = 'this_week') => {
    try {
      const response = await fetchData({
        method: 'GET',
        url: '/driver/dashboard/statistics',
        params: { range },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('[DashboardService] getStatistics error:', error);
      throw error;
    }
  };

  /**
   * Fetch earnings breakdown
   * @param range - 'today' | 'this_week' | 'this_month' | 'all'
   */
  const getEarnings = async (range: string = 'this_month'): Promise<EarningsStats> => {
    try {
      const response = await fetchData({
        method: 'GET',
        url: '/driver/dashboard/earnings',
        params: { range },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('[DashboardService] getEarnings error:', error);
      throw error;
    }
  };

  return {
    getDashboard,
    getStatistics,
    getEarnings,
  };
};
