import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 300000,
})

export const searchCities            = (q)       => client.get(`/predict/cities?q=${encodeURIComponent(q)}`)
export const runMathPrediction       = (payload) => client.post('/predict/math',       payload)
export const runHistoricalPrediction = (payload) => client.post('/predict/historical', payload)