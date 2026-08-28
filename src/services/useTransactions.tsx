
import { useState } from 'react'
import { api } from './apiClient'

type FilterParams = {
  type?: 'CREDIT' | 'DEBIT' | '';
  fromDate?: string;
  toDate?: string;
};

export default function useTransactions() {
    const [allTransactions, setAllTransactions] = useState([])
    const [summary, setSummary] = useState({
        totalCredit: 0,
        totalDebit: 0,
        totalCashReceive: 0,
        currentBalance: 0,
    })

    const getTransactions = async (filters: FilterParams = {}) => {
        try {
            const params = new URLSearchParams();
            if (filters.type) params.append('type', filters.type);
            if (filters.fromDate) params.append('fromDate', filters.fromDate);
            if (filters.toDate) params.append('toDate', filters.toDate);
            const query = params.toString() ? `?${params.toString()}` : '';
            const res = await api.get(`/user/auth/getDriverWalletHistory${query}`)
            if (res.data.success) {
                setAllTransactions(res.data.data.transactions)
                setSummary({
                    totalCredit:      res.data.data.summary?.totalCredit      ?? 0,
                    totalDebit:       res.data.data.summary?.totalDebit       ?? 0,
                    totalCashReceive: res.data.data.summary?.totalCashReceive ?? 0,
                    currentBalance:   res.data.data.balance                   ?? res.data.data.summary?.currentBalance ?? 0,
                })
            }
            return res.data
        } catch (error) {
            throw error
        }
    }

  return { getTransactions, allTransactions, setAllTransactions, summary }
}
