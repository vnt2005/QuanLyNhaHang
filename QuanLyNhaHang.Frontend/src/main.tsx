import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import AdminThemeToggle from './components/AdminThemeToggle'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminThemeToggle />
    <App />
  </StrictMode>,
)
