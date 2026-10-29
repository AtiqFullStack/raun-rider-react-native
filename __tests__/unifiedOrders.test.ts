import { getOrderType, normalizeTaxiOrder, getTaxiTripStatus, TAXI_STATUS_ACTIONS } from '../src/utils/unifiedOrders';

describe('unified taxi orders', () => {
  it('uses the source model over stale parcel classification', () => {
    expect(getOrderType({ sourceModel: 'TaxiRide', serviceType: 'parcel', _orderType: 'parcel' })).toBe('taxi');
    expect(getOrderType({ _orderType: 'taxi' })).toBe('taxi');
    expect(getOrderType({ sourceModel: 'FoodOrder' })).toBe('food');
    expect(getOrderType({ sourceModel: 'LoadRequest' })).toBe('parcel');
    expect(getOrderType({})).toBe('other');
  });

  it('keeps unified identity, authoritative status and unpriced fare while extracting ride details', () => {
    const order = normalizeTaxiOrder({
      _id: 'unified-1', sourceModel: 'TaxiRide', status: 'arrived', totalAmount: null,
      orderDetails: {
        _id: 'ride-1', status: 'pending', rideNumber: 'TX-12',
        vehicleCategoryId: { name: 'Sedan' },
        userAuthId: { _id: 'customer', fullPhoneNumber: '+919999999999' },
        pickupLocation: { latitude: 0, longitude: 75, address: 'Pickup' },
        dropoffLocation: { latitude: 26, longitude: 0, address: 'Drop' },
        notes: 'Two passengers',
      },
    });
    expect(order).toMatchObject({ _id: 'unified-1', status: 'arrived', orderStatus: 'arrived', totalAmount: null,
      orderNumber: 'TX-12', vehicleCategoryId: { name: 'Sedan' }, notes: 'Two passengers',
      customerPhone: '+919999999999', pickup: { lat: 0, lng: 75 }, drop: { lat: 26, lng: 0 } });
    expect(getTaxiTripStatus(order)).toBe('arrived');
  });

  it('preserves food and parcel payloads', () => {
    for (const sourceModel of ['FoodOrder', 'LoadRequest']) {
      const order = { sourceModel, _id: 'id', status: 'pending' };
      expect(normalizeTaxiOrder(order)).toBe(order);
    }
  });

  it('restores each ride stage and stops at completion or cancellation', () => {
    let status = getTaxiTripStatus({ status: 'assigned', tripStatus: 'CREATED' });
    const labels: string[] = [];
    while (TAXI_STATUS_ACTIONS[status]) {
      labels.push(TAXI_STATUS_ACTIONS[status].label);
      status = TAXI_STATUS_ACTIONS[status].next;
    }
    expect(labels).toEqual(['Arrived at Pickup', 'Passenger Boarded', 'Start Ride', 'Complete Ride']);
    expect(status).toBe('delivered');
    expect(TAXI_STATUS_ACTIONS.cancelled).toBeUndefined();
  });
});

it('restores saved taxi fare and payout from ride details while preserving a zero fee', () => {
  const order = normalizeTaxiOrder({ sourceModel: 'TaxiRide', orderDetails: {
    totalAmount: 25, currency: 'BND', pricing: { totalAmount: 25, driverPayout: 22.5, platformFee: 2.5 },
  } });
  expect(order).toMatchObject({ totalAmount: 25, currency: 'BND', driverPayout: 22.5, platformFee: 2.5 });
  const free = normalizeTaxiOrder({ sourceModel: 'TaxiRide', totalAmount: 0, driverPayout: 0, platformFee: 0,
    orderDetails: { totalAmount: 25, pricing: { driverPayout: 22.5, platformFee: 2.5 } } });
  expect(free).toMatchObject({ totalAmount: 0, driverPayout: 0, platformFee: 0 });
});
