import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth, API_URL } from '../services/AuthContext'
import { useToast } from '../components/Toast'

function Register() {
  const { register } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect to previous page if it exists, or to catalog
  const from = location.state?.from?.pathname || '/products'

  const [productImages, setProductImages] = useState([])
  const fallbackIcons = ['👕', '💻', '🔊', '⌚', '💎', '👟', '🕶️', '📱', '🎧', '📦', '🛍️', '💍']

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const images = data.map(p => p.image).filter(Boolean)
          setProductImages(images.slice(0, 12))
        }
      })
      .catch(err => console.error(err))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !email || !password) return

    setLoading(true)
    try {
      await register(name, email, password)
      addToast('Account created successfully! Welcome to AuraShop.', 'success')
      navigate(from, { replace: true })
    } catch (err) {
      addToast(err.message || 'Registration failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container auth-bg animate-fade-in" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Floating Product Background Animation */}
      <div className="floating-bg-container">
        {productImages.length > 0 ? (
          productImages.map((imgUrl, index) => {
            const randomLeft = `${Math.floor(index * 8) + 2}%`
            const randomDelay = `${(index * 1.2).toFixed(1)}s`
            const randomDuration = `${(15 + (index % 4) * 3)}s`
            return (
              <div 
                key={index} 
                className="floating-product-item"
                style={{
                  left: randomLeft,
                  animationDelay: randomDelay,
                  animationDuration: randomDuration
                }}
              >
                <img src={imgUrl} alt="" className="floating-product-img" />
              </div>
            )
          })
        ) : (
          fallbackIcons.map((icon, index) => {
            const randomLeft = `${Math.floor(index * 8) + 2}%`
            const randomDelay = `${(index * 1.2).toFixed(1)}s`
            const randomDuration = `${(15 + (index % 4) * 3)}s`
            return (
              <span 
                key={index} 
                className="floating-bg-item"
                style={{
                  left: randomLeft,
                  animationDelay: randomDelay,
                  animationDuration: randomDuration
                }}
              >
                {icon}
              </span>
            )
          })
        )}
      </div>

      <div 
        className="glass-panel auth-card" 
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '44px 36px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          animation: 'popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Create Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>Sign up to begin shopping with AuraShop</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="auth-input-group">
            <label htmlFor="name">Full Name</label>
            <input 
              type="text" 
              id="name" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="auth-input" 
              placeholder="John Doe"
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input" 
              placeholder="name@example.com"
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input" 
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="auth-btn" 
            disabled={loading}
            style={{ marginTop: '12px' }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '18px', height: '18px',
                  border: '2px solid currentColor',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite'
                }} />
                <span>Creating Account...</span>
              </div>
            ) : 'Register'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'underline' }}>
            Login here
          </Link>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Register
