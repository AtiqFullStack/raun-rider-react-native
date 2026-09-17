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

  // GET /api/driver/food-orders?latitude=&longitude=&type=ALL
  const getOrders = useCallback(
    (params: GetOrdersParams) => {
      const query = new URLSearchParams({
        latitude: String(params.latitude),
        longitude: String(params.longitude),
        type: params.type ?? 'ALL',
        ...(params.radiusKm !== undefined && { radiusKm: String(params.radiusKm) }),
        ...(params.page !== undefined && { page: String(params.page) }),
        ...(params.limit !== undefined && { limit: String(params.limit) }),
      }).toString();
      return request(() => api.get(`/api/driver/food-orders?${query}`));
    },
    [request],
  );

  // GET /api/driver/food-orders/:orderId
  const getOrderById = useCallback(
    (orderId: string) =>
      request(() => api.get(`/driver/food-orders/${orderId}`)),
    [request],
  );

  // PATCH /api/driver/food-orders/:orderId/accept
  const acceptOrder = useCallback(
    (orderId: string) =>
      request(() => api.patch(`/driver/food-orders/${orderId}/accept`)),
    [request],
  );

  // PATCH /api/driver/food-orders/:orderId/reject
  const rejectOrder = useCallback(
    (orderId: string, rejectionReason = '') =>
      request(() => api.patch(`/driver/food-orders/${orderId}/reject`, { rejectionReason })),
    [request],
  );

  // PATCH /api/driver/food-orders/:orderId/cancel
  const cancelOrder = useCallback(
    (orderId: string, cancellationReason = '') =>
      request(() => api.patch(`/driver/food-orders/${orderId}/cancel`, { cancellationReason })),
    [request],
  );

  // PATCH /api/driver/food-orders/:orderId/status  — status: PICKED_UP | DELIVERED
  const updateStatus = useCallback(
    (orderId: string, status: 'PICKED_UP' | 'DELIVERED') =>
      request(() => api.patch(`/driver/food-orders/${orderId}/status`, { status })),
    [request],
  );

  // GET /api/driver/food-orders/history
  const getHistory = useCallback(
    (params: Record<string, string> = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(() => api.get(`/driver/food-orders/history${query ? `?${query}` : ''}`));
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
