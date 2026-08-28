// src/constants/dummyData.ts
// ⚠️  TESTING ONLY — remove before production

export const DUMMY_TRIPS = {
  ACTIVE: [
    {
      _id: 'act_001',
      orderId: 'ORD-2025-001',
      status: 'ACCEPTED',
      isAccepted: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(), // 8 min ago
      finalPrice: 18.5,
      distance: '12 KM',
      customerId: {
        _id: 'cust_001',
        fullName: 'James Moyo',
        portraitPhoto: '',
      },
      pickup: { lat: -17.8292, lng: 31.0522, address: '14 Samora Machel Ave, Harare' },
      drop:   { lat: -17.8634, lng: 31.0251, address: 'Westgate Shopping Mall, Harare' },
      package: { itemName: 'Electronics', weight: 3.5, weightUnit: 'kg', description: 'Laptop bag' },
    },
    {
      _id: 'act_002',
      orderId: 'ORD-2025-002',
      status: 'ACCEPTED',
      isAccepted: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(), // 22 min ago
      finalPrice: 9.0,
      distance: '6 KM',
      customerId: {
        _id: 'cust_002',
        fullName: 'Tinashe Dube',
        portraitPhoto: '',
      },
      pickup: { lat: -17.7852, lng: 31.0389, address: 'Borrowdale Brooke, Harare' },
      drop:   { lat: -17.8012, lng: 31.0444, address: 'Avondale Shopping Centre, Harare' },
      package: { itemName: 'Groceries', weight: 8.0, weightUnit: 'kg', description: 'Weekly groceries' },
    },
  ],

  PENDING: [
    {
      _id: 'pen_001',
      orderId: 'ORD-2025-003',
      status: 'PENDING',
      isAccepted: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(), // 3 min ago
      finalPrice: 12.0,
      distance: '8 KM',
      customerId: {
        _id: 'cust_003',
        fullName: 'Chiedza Nyamukapa',
        portraitPhoto: '',
      },
      pickup: { lat: -17.8201, lng: 31.0655, address: 'Msasa Industrial, Harare' },
      drop:   { lat: -17.8412, lng: 31.0523, address: 'Eastlea, Harare' },
      package: { itemName: 'Documents', weight: 0.5, weightUnit: 'kg', description: 'Legal papers' },
    },
    {
      _id: 'pen_002',
      orderId: 'ORD-2025-004',
      status: 'PENDING',
      isAccepted: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(), // 1 min ago
      finalPrice: 25.0,
      distance: '18 KM',
      customerId: {
        _id: 'cust_004',
        fullName: 'Brian Mutasa',
        portraitPhoto: '',
      },
      pickup: { lat: -17.7900, lng: 31.0100, address: 'Dzivaresekwa, Harare' },
      drop:   { lat: -17.9200, lng: 31.1100, address: 'Ruwa Shopping Centre, Ruwa' },
      package: { itemName: 'Furniture', weight: 45.0, weightUnit: 'kg', description: 'Small cabinet' },
    },
    {
      _id: 'pen_003',
      orderId: 'ORD-2025-005',
      status: 'PENDING',
      isAccepted: false,
      createdAt: new Date(Date.now() - 1000 * 30).toISOString(), // 30 sec ago
      finalPrice: 7.5,
      distance: '4 KM',
      customerId: {
        _id: 'cust_005',
        fullName: 'Rutendo Chikwanda',
        portraitPhoto: '',
      },
      pickup: { lat: -17.8300, lng: 31.0600, address: 'Newlands, Harare' },
      drop:   { lat: -17.8450, lng: 31.0750, address: 'Highlands, Harare' },
      package: { itemName: 'Food Parcel', weight: 2.0, weightUnit: 'kg', description: 'Restaurant order' },
    },
  ],

  COMPLETED: [
    {
      _id: 'com_001',
      orderId: 'ORD-2025-088',
      status: 'COMPLETED',
      isAccepted: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hrs ago
      finalPrice: 22.0,
      distance: '14 KM',
      customerId: {
        _id: 'cust_006',
        fullName: 'Farai Ncube',
        portraitPhoto: '',
      },
      pickup: { lat: -17.8292, lng: 31.0522, address: 'CBD, Harare' },
      drop:   { lat: -17.9500, lng: 31.1200, address: 'Chitungwiza Town Centre' },
      package: { itemName: 'Clothing', weight: 5.0, weightUnit: 'kg', description: 'Online order' },
    },
    {
      _id: 'com_002',
      orderId: 'ORD-2025-071',
      status: 'COMPLETED',
      isAccepted: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // yesterday
      finalPrice: 35.0,
      distance: '22 KM',
      customerId: {
        _id: 'cust_007',
        fullName: 'Simba Chirwa',
        portraitPhoto: '',
      },
      pickup: { lat: -17.7600, lng: 30.9800, address: 'Mount Pleasant, Harare' },
      drop:   { lat: -18.0000, lng: 31.2000, address: 'Marondera Road' },
      package: { itemName: 'Auto Parts', weight: 18.0, weightUnit: 'kg', description: 'Car spare parts' },
    },
    {
      _id: 'com_003',
      orderId: 'ORD-2025-055',
      status: 'COMPLETED',
      isAccepted: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
      finalPrice: 11.0,
      distance: '7 KM',
      customerId: {
        _id: 'cust_008',
        fullName: 'Pamela Zvokuomba',
        portraitPhoto: '',
      },
      pickup: { lat: -17.8100, lng: 31.0400, address: 'Sam Levy Village, Borrowdale' },
      drop:   { lat: -17.8300, lng: 31.0200, address: 'Greendale, Harare' },
      package: { itemName: 'Pharmacy Items', weight: 1.2, weightUnit: 'kg', description: 'Prescription medicine' },
    },
  ],

  CANCELLED: [
    {
      _id: 'can_001',
      orderId: 'ORD-2025-042',
      status: 'CANCELLED',
      isAccepted: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hrs ago
      finalPrice: 14.0,
      distance: '9 KM',
      customerId: {
        _id: 'cust_009',
        fullName: 'Tawanda Mhere',
        portraitPhoto: '',
      },
      pickup: { lat: -17.8200, lng: 31.0500, address: 'Belgravia, Harare' },
      drop:   { lat: -17.8600, lng: 31.0300, address: 'Mabelreign, Harare' },
      package: { itemName: 'Books', weight: 4.0, weightUnit: 'kg', description: 'University textbooks' },
    },
    {
      _id: 'can_002',
      orderId: 'ORD-2025-038',
      status: 'CANCELLED',
      isAccepted: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hrs ago
      finalPrice: 8.0,
      distance: '5 KM',
      customerId: {
        _id: 'cust_010',
        fullName: 'Nkosi Banda',
        portraitPhoto: '',
      },
      pickup: { lat: -17.8350, lng: 31.0450, address: 'Waterfalls, Harare' },
      drop:   { lat: -17.8500, lng: 31.0600, address: 'Mbare, Harare' },
      package: { itemName: 'Household Items', weight: 6.5, weightUnit: 'kg', description: 'Kitchen utensils' },
    },
  ],
};
