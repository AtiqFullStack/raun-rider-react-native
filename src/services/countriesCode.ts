export interface CountryCode {
  name: string;
  code: string; // +91
  iso: string;
}

// export const getCountryCodes = async (): Promise<CountryCode[]> => {
//   const res = await fetch(
//     'https://restcountries.com/v3.1/all?fields=name,idd,cca2'
//   );
//   const data = await res.json();

//   const allowedCountries = ['Zimbabwe', 'South Africa', 'Zambia'];

//   return data
//     .filter((c: any) =>
//       allowedCountries.includes(c.name.common)
//     )
//     .map((c: any) => ({
//       name: c.name.common,
//       iso: c.cca2,
//       code: `${c.idd.root}${c.idd.suffixes?.[0] || ''}`,
//     }))
//     .sort((a: CountryCode, b: CountryCode) =>
//       a.name.localeCompare(b.name)
//     );
// };

export interface CountryCode {
  name: string;
  code: string; // +91
  iso: string;
}

export const getCountryCodes = async (): Promise<CountryCode[]> => {
  return [
       {
      name: 'Guyana',
      code: '+592',
      iso: 'GY',
      length:7
    },
    {
      name: 'United State',
      code: '+1',
      iso: 'US',
       length:10
    },
  ].sort((a, b) => a.name.localeCompare(b.name));
};