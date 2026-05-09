import { Routes, Route } from 'react-router-dom'
import Landing           from './pages/Landing'
import MathPredict       from './pages/MathPredict'
import HistoricalPredict from './pages/HistoricalPredict'

export default function App() {
  return (
    <Routes>
      <Route path="/"                    element={<Landing />}            />
      <Route path="/predict/math"        element={<MathPredict />}        />
      <Route path="/predict/historical"  element={<HistoricalPredict />}  />
    </Routes>
  )
}