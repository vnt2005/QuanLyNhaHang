import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './pages/access-management.css'
import './pages/areas-tables.css'
import './pages/menu-management.css'
import './pages/orders.css'
import './pages/kitchen.css'
import './pages/payments.css'
import './pages/invoices.css'
import './pages/revenue-reports.css'
import './pages/table-qr-codes.css'
import './pages/restaurant-settings.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
