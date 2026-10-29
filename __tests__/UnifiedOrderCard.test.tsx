import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import UnifiedOrderCard from '../src/components/UnifiedOrderCard';
import { api } from '../src/services/apiClient';

jest.mock('../src/services/apiClient', () => ({ api: { post: jest.fn() } }));
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const defaults = { _id: 'unified-ride', createdAt: new Date().toISOString(), onPress: jest.fn() };
const textOf = (tree: renderer.ReactTestRenderer) => JSON.stringify(tree.toJSON());
const button = (tree: renderer.ReactTestRenderer, text: string) =>
  tree.root.findAllByType(TouchableOpacity).reverse().find(node =>
    node.findAllByType('Text' as any).some(label => label.children.join('') === text),
  )!;

afterEach(() => jest.clearAllMocks());

it('shows TAXI and accepts a pending ride directly without sending a quote', async () => {
  const accepted = { _id: 'unified-ride', status: 'assigned' };
  (api.post as jest.Mock).mockResolvedValue({ data: { data: { order: accepted } } });
  const onAccept = jest.fn(); const onSendQuote = jest.fn();
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<UnifiedOrderCard {...defaults} _orderType="taxi" status="pending" vehicleCategoryName="Sedan" onAccept={onAccept} onSendQuote={onSendQuote} />); });
  expect(textOf(tree)).toContain('TAXI');
  expect(textOf(tree)).toContain('Sedan');
  expect(textOf(tree)).not.toContain('Send Quote');
  await act(async () => { await button(tree, 'Accept Ride').props.onPress(); });
  expect(api.post).toHaveBeenCalledWith('/driver/orders/unified/unified-ride/accept');
  expect(onAccept).toHaveBeenCalledWith(accepted);
  expect(onSendQuote).not.toHaveBeenCalled();
  await act(async () => tree.unmount());
});

it('keeps an arrived taxi active', async () => {
  const onGoToTrip = jest.fn(); let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<UnifiedOrderCard {...defaults} _orderType="taxi" status="arrived" driverId="driver" onGoToTrip={onGoToTrip} />); });
  expect(textOf(tree)).toContain('Go to Trip');
  expect(textOf(tree)).not.toContain('Accept Ride');
  await act(async () => tree.unmount());
});

it('keeps parcel quoting and food direct acceptance', async () => {
  const onSendQuote = jest.fn(); let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<UnifiedOrderCard {...defaults} _orderType="parcel" status="pending" onSendQuote={onSendQuote} />); });
  await act(async () => { await button(tree, 'Send Quote').props.onPress(); });
  expect(onSendQuote).toHaveBeenCalledTimes(1);
  expect(api.post).not.toHaveBeenCalled();
  await act(async () => { tree.update(<UnifiedOrderCard {...defaults} _orderType="food" orderStatus="pending" />); });
  expect(textOf(tree)).toContain('Accept Order');
  await act(async () => tree.unmount());
});

it('does not navigate after a failed acceptance', async () => {
  (api.post as jest.Mock).mockRejectedValue(new Error('Ride no longer available'));
  const onAccept = jest.fn(); let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<UnifiedOrderCard {...defaults} _orderType="taxi" status="pending" onAccept={onAccept} />); });
  await act(async () => { await button(tree, 'Accept Ride').props.onPress(); });
  expect(onAccept).not.toHaveBeenCalled();
  expect(button(tree, 'Accept Ride').props.disabled).toBe(false);
  await act(async () => tree.unmount());
});

it('sends only one acceptance when tapped twice before the response', async () => {
  let resolve!: (value: any) => void;
  (api.post as jest.Mock).mockImplementation(() => new Promise(done => { resolve = done; }));
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<UnifiedOrderCard {...defaults} _orderType="taxi" status="pending" />); });
  await act(async () => {
    const accept = button(tree, 'Accept Ride').props.onPress;
    const first = accept();
    const second = accept();
    resolve({ data: { data: { order: { status: 'assigned' } } } });
    await Promise.all([first, second]);
  });
  expect(api.post).toHaveBeenCalledTimes(1);
  await act(async () => tree.unmount());
});
