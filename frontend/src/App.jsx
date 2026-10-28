import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import VoiceLayout from './components/VoiceLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ColdCalling from './pages/ColdCalling'
import Enquiries from './pages/Enquiries'
import WarmLeads from './pages/WarmLeads'
import FollowUps from './pages/FollowUps'
import Admissions from './pages/Admissions'
import Reviews from './pages/Reviews'
import Support from './pages/Support'
import Academics from './pages/Academics'
import Fees from './pages/Fees'
import CommunicationHub from './pages/CommunicationHub'
import Settings from './pages/Settings'
import Help from './pages/Help'

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/admin" replace />} />

            {/* Protected Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <VoiceLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="cold-calling" element={<ColdCalling />} />
              <Route path="enquiries" element={<Enquiries />} />
              <Route path="warm-leads" element={<WarmLeads />} />
              <Route path="follow-ups" element={<FollowUps />} />
              <Route path="admissions" element={<Admissions />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="support" element={<Support />} />
              <Route path="students" element={<Academics />} />
              <Route path="fees" element={<Fees />} />
              <Route path="communication" element={<CommunicationHub />} />
              <Route path="settings" element={<Settings />} />
              <Route path="help" element={<Help />} />
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App

