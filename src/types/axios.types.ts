import { AxiosRequestConfig } from "axios"

export type FetchArgs = {
  method: AxiosRequestConfig['method']
  url: string
  params?: any
  data?: any
  headers?: any,
  showLoader?:boolean
}