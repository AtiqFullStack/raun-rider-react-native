jest.mock('react-native-maps', () => {
  const React = require('react'); const { View } = require('react-native');
  const Map = (props: any) => React.createElement(View, null, props.children);
  const Marker = (props: any) => React.createElement(View, null, props.children);
  Marker.Animated = Marker;
  return { __esModule: true, default: Map, Marker, Polyline: () => null };
});
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Marker } from 'react-native-maps';
import RideMap from '../src/components/ride/RideMap';
const pickup = { lat: 26, lng: 75 };
const drop = { lat: 27, lng: 76 };
const driver = { latitude: 26.1, longitude: 75.1 };
let tree: ReactTestRenderer;
afterEach(async () => { await act(async () => tree?.unmount()); });
test.each(['assigned', 'arrived', 'picked_up', 'in_transit'])('driver taxi map uses the correct destination in %s', async status => {
  await act(async () => {
    tree = create(<RideMap mapRef={{ current: null } as any} coordinate={driver as any} driverLocation={driver} pickup={pickup} drop={drop} routeCoords={[]} currentHeading={0} rideStarted isTaxiRide tripStatus={status} />);
  });
  const points = tree.root.findAllByType(Marker).map(node => node.props.coordinate);
  const afterPickup = ['picked_up', 'in_transit'].includes(status);
  expect(points).toContainEqual(afterPickup ? { latitude: 27, longitude: 76 } : { latitude: 26, longitude: 75 });
  expect(points).not.toContainEqual(afterPickup ? { latitude: 26, longitude: 75 } : { latitude: 27, longitude: 76 });
  expect(points).toContainEqual(driver);
});
