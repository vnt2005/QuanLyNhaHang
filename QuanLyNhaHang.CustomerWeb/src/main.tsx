import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './menu-item-detail.css'
import './takeaway.css'
import './customer-promotion.css'
import './home-premium.css'
import './menu-premium.css'
import './customer-premium-shell.css'
import './reservation-premium.css'
import './account-premium.css'
import './orders-page.css'

if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
