export type UnifiedOrderType = 'food' | 'parcel' | 'taxi' | 'other';

export function getOrderType(order: any): UnifiedOrderType {
  const sourceTypes: Record<string, UnifiedOrderType> = {
    TaxiRide: 'taxi', FoodOrder: 'food', LoadRequest: 'parcel',
  };
  if (sourceTypes[order?.sourceModel]) return sourceTypes[order.sourceModel];
  const type = String(order?._orderType || order?.serviceType || '').toLowerCase();
  if (['food', 'parcel', 'taxi'].includes(type)) return type as UnifiedOrderType;
  if (order?.restaurantId || order?.orderNumber?.startsWith('R-FD')) return 'food';
  if (order?.loadRequestNumber) return 'parcel';
  return 'other';
}

// Source details supply passenger/category data; the unified document owns ID/status.
export function normalizeTaxiOrder(order: any) {
  if (getOrderType(order) !== 'taxi') return order;
  const ride = order.orderDetails || {};
  const passenger = ride.userAuthId || order.userAuthId || order.customerId || {};
  const point = (location: any) => ({
    lat: location?.latitude, lng: location?.longitude, address: location?.address,
  });
  return {
    ...order,
    _orderType: 'taxi', serviceType: 'taxi',
    rideNumber: ride.rideNumber || order.rideNumber,
    orderNumber: ride.rideNumber || order.rideNumber || order.orderNumber,
    vehicleCategoryId: ride.vehicleCategoryId || order.vehicleCategoryId,
    userAuthId: passenger,
    customerPhone: passenger.fullPhoneNumber || order.customerPhone ||
      (passenger.phoneNumber ? `${passenger.countryCode || ''}${passenger.phoneNumber}` : undefined),
    pickup: order.pickup || point(ride.pickupLocation || order.pickupLocation),
    drop: order.drop || point(ride.dropoffLocation || order.dropoffLocation),
    notes: ride.notes || order.notes,
    status: order.status || ride.status || 'pending',
    orderStatus: order.status || ride.status || 'pending',
  };
}

export const TAXI_STATUS_ACTIONS: Record<string, { next: string; label: string }> = {
  assigned: { next: 'arrived', label: 'Arrived at Pickup' },
  arrived: { next: 'picked_up', label: 'Passenger Boarded' },
  picked_up: { next: 'in_transit', label: 'Start Ride' },
  in_transit: { next: 'delivered', label: 'Complete Ride' },
};

export function getTaxiTripStatus(order: any): string {
  return String(order?.status || order?.orderStatus || order?.tripStatus || 'pending').toLowerCase();
}
