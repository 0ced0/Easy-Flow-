import { Route, Routes } from 'react-router-dom'
import MainDashboard from './pages/mainDashboard.jsx'
import './App.css'

function App() {

  return (
    <Routes>
      <Route path="/" element={<MainDashboard />} />
    </Routes>

  )
}

export default App
