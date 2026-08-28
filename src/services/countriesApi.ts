const CSC_API_KEY = '330089a58b57198ad7017886b2d96f0b29bf47d276ae997e6a84fb5c82e9ebcb';

const BASE_URL = 'https://api.countrystatecity.in/v1';

export const cscApi = {
  get: async (endpoint: string) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'X-CSCAPI-KEY': CSC_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  },
};
