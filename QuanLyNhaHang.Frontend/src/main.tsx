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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
