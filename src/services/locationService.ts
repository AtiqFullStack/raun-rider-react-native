import { cscApi } from './countriesApi';

export const locationService = {
  // 🌍 Fetch all countries
 getCountries: async () => {
  const data = await cscApi.get('/countries');

  const allowedCountries = [
    'Guyana',        // 👈 added
    'United States'  // 👈 added (USA ka correct name API me yahi hota hai)
  ];

  return allowedCountries
    .map(countryName =>
      data.find((country: any) => country.name === countryName)
    )
    .filter(Boolean)
    .map((country: any) => ({
      id: country.iso2,
      name: country.name,
      code: country.iso2,
    }));
},

  // 🏙 Fetch states by country code
  getStates: async (countryCode: string) => {
    const data = await cscApi.get(
      `/countries/${countryCode}/states`
    );

    return data.map((state: any) => ({
      id: state.id,
      name: state.name,
      countryId: countryCode,
    }));
  },
  
};
