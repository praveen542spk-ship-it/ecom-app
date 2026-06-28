import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Products from './pages/Products'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CheckoutSuccess from './pages/CheckoutSuccess'
import Settings from './pages/Settings'
import { ToastProvider } from './components/Toast'
import { AuthProvider, useAuth } from './services/AuthContext'
import { CartProvider } from './services/CartContext'
import { LanguageProvider } from './services/LanguageContext'

function AppContent() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [showPrompt, setShowPrompt] = useState(false)

  // Sync state on load or when authentication status changes
  useEffect(() => {
    if (!loading) {
      const isPromptSkipped = sessionStorage.getItem('aura_login_prompt_skipped') === 'true'
      /* eslint-disable react-hooks/set-state-in-effect */
      if (!isAuthenticated && !isPromptSkipped) {
        setShowPrompt(true)
      } else {
        setShowPrompt(false)
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isAuthenticated, loading])

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <h2 style={{ fontSize: '20px', color: 'var(--text-muted)' }}>Loading AuraShop...</h2>
      </div>
    )
  }

  // Allowed pages without login prompt modal
  const isPublicPage = ['/login', '/register'].includes(location.pathname)

  const handleSkip = () => {
    sessionStorage.setItem('aura_login_prompt_skipped', 'true')
    setShowPrompt(false)
  }

  const handleSignIn = () => {
    setShowPrompt(false)
    navigate('/login')
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/products' element={<Products />} />
        <Route path='/cart' element={<Cart />} />
        <Route path='/checkout' element={<Checkout />} />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path='/dashboard' element={<Dashboard />} />
        <Route path='/settings' element={<Settings />} />
        <Route path='/checkout-success' element={<CheckoutSuccess />} />
      </Routes>

      {/* Guest Login Prompt Modal */}
      {showPrompt && !isPublicPage && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10, 10, 15, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '440px', padding: '36px',
            background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)', textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>✨</span>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
              Welcome to AuraShop
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, marginBottom: '24px' }}>
              Sign in to unlock exclusive coupons (up to 30% off!), order tracking, saved addresses, and a personalized experience.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={handleSignIn} 
                className="btn-primary" 
                style={{ padding: '12px', fontSize: '14px', fontWeight: 700 }}
              >
                Sign In / Register
              </button>
              <button 
                onClick={handleSkip} 
                className="btn-secondary" 
                style={{ padding: '12px', fontSize: '13px', fontWeight: 600, border: '1px dashed var(--border-color)' }}
              >
                Skip & Browse as Guest
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <LanguageProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </LanguageProvider>
      </CartProvider>
    </AuthProvider>
  )
}

export default App