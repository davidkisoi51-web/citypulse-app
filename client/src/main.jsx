import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import AuthProvider from './auth/AuthProvider.jsx'
import AdminEventsProvider from './admin/AdminEventsProvider.jsx'
import SavedEventsProvider from './plans/SavedEventsProvider.jsx'
import AdminPage from './pages/AdminPage.jsx'
import PaymentPage from './pages/PaymentPage.jsx'
import MyTicketsPage from './pages/MyTicketsPage.jsx'
import MyPlansPage from './pages/MyPlansPage.jsx'
import PlanDetailsPage from './pages/PlanDetailsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import VerifyCode from './pages/VerifyCode.jsx'
import NewPassword from './pages/ResetPassword.jsx'
import ResetSuccess from './pages/ResetSuccess.jsx'
import About from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import Privacy from './pages/Privacy.jsx'
import Terms from './pages/Terms.jsx'
import Cookies from './pages/Cookies.jsx'
import VerifyEmailPage from './pages/VerifyEmailPage.jsx'
import NotificationSettings from './pages/NotificationSettings.jsx'

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AdminEventsProvider>
        <SavedEventsProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-code" element={<VerifyCode/>}/>
          <Route path="/verify-email" element={<VerifyEmailPage/>}/>
          <Route path="/reset-password" element={<NewPassword />} />
          <Route path="/reset-success" element={<ResetSuccess/>}/>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/pay/:eventId" element={<PaymentPage />} />
          <Route path="/my-tickets" element={<MyTicketsPage />} />
          <Route path="/plans" element={<MyPlansPage />} />
          <Route path="/plans/:planId" element={<PlanDetailsPage />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
          <Route path="/about-us" element={<About />} />
          <Route path="/contact-us" element={<Contact />} />
          <Route path="/privacy-policy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="*" element={<App />} />
        </Routes>
        </SavedEventsProvider>
        </AdminEventsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
