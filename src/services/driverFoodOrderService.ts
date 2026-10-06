import { useCallback, useState } from 'react';
import { api } from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FoodOrder {
  _id: string;
  orderStatus: string;
  assignedDriverId?: string;
  restaurantId: { _id: string; name: string; location: any };
  userAuthId: { _id: string; countryCode: string; phoneNumber: string; fullPhoneNumber: string };
  items: any[];
  totalAmount: number;
  deliveryAddress: any;
  createdAt: string;
  updatedAt: string;
}

export interface GetOrdersParams {
  latitude: number;
  longitude: number;
  type?: 'ALL' | 'ACTIVE';
  radiusKm?: number;
  page?: number;
  limit?: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useDriverFoodOrderService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // GET /api/driver/orders/unified?latitude=&longitude=&sourceModel=all
  const getOrders = useCallback(
    (params: GetOrdersParams) => {
      const query = new URLSearchParams({
        sourceModel: 'all',
        status: params.type === 'ACTIVE' ? 'active' : 'all',
        latitude: String(params.latitude),
        longitude: String(params.longitude),
        ...(params.radiusKm !== undefined && { radiusKm: String(params.radiusKm) }),
        ...(params.page !== undefined && { page: String(params.page) }),
        ...(params.limit !== undefined && { limit: String(params.limit) }),
      }).toString();
      return request(() => api.get(`/driver/orders/unified?${query}`));
    },
    [request],
  );

  // GET /api/driver/orders/unified/:orderId
  const getOrderById = useCallback(
    (orderId: string) =>
      request(() => api.get(`/driver/orders/unified/${orderId}`)),
    [request],
  );

  // POST /api/driver/orders/unified/:orderId/accept
  const acceptOrder = useCallback(
    (orderId: string) =>
      request(() => api.post(`/driver/orders/unified/${orderId}/accept`)),
    [request],
  );

  // POST /api/driver/orders/unified/:orderId/reject
  const rejectOrder = useCallback(
    (orderId: string, rejectionReason = '') =>
      request(() => api.post(`/driver/orders/unified/${orderId}/reject`, { reason: rejectionReason })),
    [request],
  );

  // PATCH /api/driver/orders/unified/:orderId/status - cancelled
  const cancelOrder = useCallback(
    (orderId: string, cancellationReason = '') =>
      request(() => api.patch(`/driver/orders/unified/${orderId}/status`, { status: 'cancelled', reason: cancellationReason })),
    [request],
  );

  // PATCH /api/driver/orders/unified/:orderId/status  — status: picked_up | delivered
  const updateStatus = useCallback(
    (orderId: string, status: 'PICKED_UP' | 'DELIVERED' | 'picked_up' | 'delivered') => {
      const normStatus = status.toLowerCase();
      return request(() => api.patch(`/driver/orders/unified/${orderId}/status`, { status: normStatus }));
    },
    [request],
  );

  // GET /api/driver/orders/unified?status=delivered
  const getHistory = useCallback(
    (params: Record<string, string> = {}) => {
      const query = new URLSearchParams({ status: 'delivered', ...params }).toString();
      return request(() => api.get(`/driver/orders/unified?${query}`));
    },
    [request],
  );

  return {
    getOrders,
    getOrderById,
    acceptOrder,
    rejectOrder,
    cancelOrder,
    updateStatus,
    getHistory,
    loading,
    error,
  };
};
