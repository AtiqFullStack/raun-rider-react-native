export const linking = {
  prefixes: ['tncmerchant://'],

  config: {
    screens: {
      Tabs: {
        screens: {
          Home: {
            screens: {
              HomeMain: 'home',
              AllOrders: 'orders',
              ChatScreen: 'home/chat/:chatId',
              TripComplete: 'home/trip-complete',
              RatingScreen: 'home/rating/:id',
            },
          },

          Trips: {
            screens: {
              AllOrdersMain: 'trips',
              ChatScreen: 'trips/chat/:chatId',
              TripComplete: 'trips/trip-complete',
              RatingScreen: 'trips/rating/:id',
            },
          },

          History: 'history',

          Profile: {
            screens: {
              ProfileMain: 'profile',
              EditVehicle: 'profile/edit-vehicle',
              EditPersonalDetails: 'profile/edit-personal-details',
            },
          },
        },
      },

      // ⭐ GLOBAL SCREENS (NO CONFLICT HERE)
      RideDetails: 'ride/:id',
      Notification: 'notification',
    },
  },
};
