import axios from 'axios'

const client = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 300000,  // 5 min — Landsat processing is slow
})

export const searchCities         = (q)       => client.get(`/predict/cities?q=${encodeURIComponent(q)}`)
export const runMathPrediction    = (payload) => client.post('/predict/math',       payload)
export const runHistoricalPrediction = (payload) => client.post('/predict/historical', payload)