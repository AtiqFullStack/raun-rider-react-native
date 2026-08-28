// context/QuoteContext.tsx
import React, { createContext, useContext, useState } from 'react';

interface QuoteContextType {
  sentQuotes: string[];
  addSentQuote: (orderId: string) => void;
  clearSentQuotes: () => void;
}

const QuoteContext = createContext<QuoteContextType>({
  sentQuotes: [],
  addSentQuote: () => {},
  clearSentQuotes: () => {},
});

export const QuoteProvider = ({ children }: { children: React.ReactNode }) => {
  const [sentQuotes, setSentQuotes] = useState<string[]>([]);

  const addSentQuote = (orderId: string) => {
    setSentQuotes(prev => 
      prev.includes(orderId) ? prev : [...prev, orderId]
    );
  };

  const clearSentQuotes = () => setSentQuotes([]);

  return (
    <QuoteContext.Provider value={{ sentQuotes, addSentQuote, clearSentQuotes }}>
      {children}
    </QuoteContext.Provider>
  );
};

export const useQuotes = () => useContext(QuoteContext);