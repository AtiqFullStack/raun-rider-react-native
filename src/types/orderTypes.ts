export interface Order {
  _id: string;

  pickup: {
    lat: number;
    lng: number;
    address: string;
  };

  drop: {
    lat: number;
    lng: number;
    address: string;
  };

  sender: {
    name: string;
    phone: string;
    label: string;
  };

  receiver: {
    name: string;
    phone: string;
    label: string;
  };

  package: {
    itemName: string;
    weight: number;
    description: string;
    payer: string;
    paymentMode: string;
  };

  vehicleType: string;
  status: string;
  orderId: string;
  createdAt: string;
}