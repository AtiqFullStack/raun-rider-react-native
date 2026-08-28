import { api } from './apiClient';
// api/v1/payment/process


const paymentService = () => {
    const createPayment = async (payload:any) => {
        console.log(payload, 'payload in service')
        try {
            const res = await api.post('/payment/process', payload)
            return res.data

        } catch (error) {
            throw error

        }
    }

const getPaymenStatus = async(paymentId:string)=>{
    try {
        const res = await api.post('/payment/check-status',{
            paymentId:paymentId
        })
        return res.data
    } catch (error) {
        throw error
    }
}
    return {createPayment ,getPaymenStatus}
}

export default paymentService
