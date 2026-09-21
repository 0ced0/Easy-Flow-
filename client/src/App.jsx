import { Navigate, Route, Routes } from 'react-router-dom'
import MainDashboard from './pages/mainDashboard.jsx'
import TrafficLightControlsPage from './pages/trafficControls.jsx'
import DataTablePage from './pages/dataTablePage.jsx'
import ViolationRecordsPage from './pages/violationRecordsPage.jsx'
import LandingPage from './pages/landingPage.jsx'
import './App.css'

function App() {

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/landing" replace />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/dashboard" element={<MainDashboard />} />
      <Route path="/traffic_light_controls_page" element={<TrafficLightControlsPage />}/>
      <Route path="/data_table_page" element={<DataTablePage />}/>
      <Route path="/violation_records" element={<ViolationRecordsPage />}/>
    </Routes>

  )
}

export default App
