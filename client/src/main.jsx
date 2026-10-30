import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
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
import About from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import Privacy from './pages/Privacy.jsx'
import Terms from './pages/Terms.jsx'
import Cookies from './pages/Cookies.jsx'
import TransferTickets from './components/TransferTicket.jsx'

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
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/pay/:eventId" element={<PaymentPage />} />
          <Route path="/my-tickets" element={<MyTicketsPage />} />
          <Route path="/transfer-ticket" element={<TransferTickets />} />
          <Route path="/plans" element={<MyPlansPage />} />
          <Route path="/plans/:planId" element={<PlanDetailsPage />} />
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
