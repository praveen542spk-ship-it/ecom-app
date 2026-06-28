import { useState, useEffect, useRef, Fragment } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../services/CartContext'
import { useAuth, API_URL } from '../services/AuthContext'
import { useLanguage } from '../services/LanguageContext'

function Navbar() {
  const { cart } = useCart()
  const { user, logout, isAuthenticated } = useAuth()
  const { t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()

  const [theme, setTheme] = useState(localStorage.getItem('aura-theme') || 'dark')
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  const searchRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('aura-theme', theme)
  }, [theme])

  // Fetch product list for auto-suggestions on load
  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error(err))
  }, [])

  // Close suggestion box / menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light')
  }

  // Handle Search Input Change
  const handleSearchChange = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    
    if (query.trim() === '') {
      setSuggestions([])
      return
    }

    const filtered = products.filter(p => 
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5) // Limit to top 5 suggestions

    setSuggestions(filtered)
    setShowSuggestions(true)
  }

  // Handle Suggestion Item Click
  const handleSuggestionClick = (product) => {
    setSearchQuery(product.title)
    setShowSuggestions(false)
    navigate(`/products?search=${encodeURIComponent(product.title)}`)
  }

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setShowSuggestions(false)
    navigate(`/products?search=${encodeURIComponent(searchQuery)}`)
  }

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
    navigate('/login')
  }

  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0)
  const isLinkActive = (path) => location.pathname === path

  return (
    <Fragment>
      <nav className="custom-navbar">
        {/* 1. Logo */}
        <Link to="/" className="flex items-center no-underline mr-4 group select-none">
          <span 
            className="brand-font font-bold text-2xl bg-clip-text text-transparent group-hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            AuraShop
          </span>
          <span className="text-[11px] text-gray-500 font-bold ml-1 self-end mb-1">.in</span>
        </Link>

        {/* 2. Search Bar */}
        <form 
          onSubmit={handleSearchSubmit} 
          ref={searchRef}
          className="navbar-search-form flex-grow max-w-xl mx-4 md:mx-6 relative"
        >
          <input 
            type="text" 
            placeholder="Search products, brands and categories..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchQuery.trim() !== '' && setShowSuggestions(true)}
            className="w-full h-10 px-4 border-none outline-none text-sm text-gray-900 bg-white rounded-l-md"
          />
          <button 
            type="submit"
            className="w-12 h-10 bg-primary hover:bg-primary-hover text-white border-none rounded-r-md cursor-pointer flex items-center justify-center transition-colors text-lg"
          >
            <span className="material-symbols-outlined text-[20px] font-bold">search</span>
          </button>

          {/* Search Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestion-box divide-y divide-gray-100">
              {suggestions.map((product) => (
                <div 
                  key={product.id}
                  onClick={() => handleSuggestionClick(product)}
                  className="suggestion-item hover:bg-gray-50 hover:text-gray-900 flex justify-between items-center transition-colors p-3"
                >
                  <div className="flex items-center gap-2">
                    <img src={product.image} alt="" className="w-7 h-7 object-contain bg-white p-0.5 rounded border" />
                    <span className="font-semibold truncate max-w-[300px] text-gray-800">{product.title}</span>
                  </div>
                  <span className="text-xs text-gray-500 font-semibold whitespace-nowrap ml-2">in {product.category}</span>
                </div>
              ))}
            </div>
          )}
        </form>

        {/* 3. Navigation Menu Links & Actions (Desktop Links + Top Nav Actions) */}
        <div className="flex items-center gap-6">
          
          {/* Desktop Nav Links (Hidden on mobile via CSS) */}
        <div className="desktop-nav-links flex items-center gap-6">
          <Link 
              to="/" 
              className={`text-sm font-semibold hover:text-primary transition-colors no-underline ${
                isLinkActive('/') ? 'text-primary font-bold' : 'text-gray-300'
              }`}
            >
              {t('home')}
            </Link>
            
            <Link 
              to="/products" 
              className={`text-sm font-semibold hover:text-primary transition-colors no-underline ${
                isLinkActive('/products') ? 'text-primary font-bold' : 'text-gray-300'
              }`}
            >
              {t('catalog')}
            </Link>

            {/* Cart Item Badge */}
            <Link 
              to="/cart" 
              className="flex items-center gap-2 relative no-underline hover:text-primary transition-colors"
            >
              <div className="relative flex items-center">
                <span className="material-symbols-outlined text-[24px] text-gray-300 hover:text-primary transition-colors">shopping_cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#f43f5e] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-sm font-bold text-primary">{t('cart')}</span>
            </Link>
          </div>

          {/* Top Nav Actions (Always at Top) */}
          <div className="flex items-center gap-4">
            {/* User Account Menu or Separate Sign In Button */}
            {isAuthenticated ? (
              <div ref={menuRef} className="relative">
                <div 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex flex-col cursor-pointer justify-center select-none"
                >
                  <span className="text-[10px] text-gray-400">
                    Hello, {(() => {
                      if (!user?.email) return user?.name?.split(' ')[0] || 'User'
                      try {
                        const saved = localStorage.getItem(`profile_details_${user.email}`)
                        if (saved) {
                          const parsed = JSON.parse(saved)
                          if (parsed.name) return parsed.name.split(' ')[0]
                        }
                      } catch (err) {
                        console.error(err)
                      }
                      return user?.name?.split(' ')[0] || 'User'
                    })()}
                  </span>
                  <span className="text-[13px] font-bold text-gray-200 hover:text-white transition-colors flex items-center gap-1">
                    {t('account')} <span className="text-[9px] self-center">▼</span>
                  </span>
                </div>

                {/* User Floating Dropdown */}
                {showUserMenu && (
                  <div className="user-dropdown-menu">
                    <Link 
                      to="/dashboard" 
                      onClick={() => setShowUserMenu(false)}
                      className="user-dropdown-item"
                    >
                      <span className="material-symbols-outlined text-[18px]">person</span>
                      <span>{t('myProfile')}</span>
                    </Link>
                    <Link 
                      to="/dashboard?tab=orders" 
                      onClick={() => setShowUserMenu(false)}
                      className="user-dropdown-item"
                    >
                      <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                      <span>{t('trackOrders')}</span>
                    </Link>
                    <Link 
                      to="/dashboard?tab=wishlist" 
                      onClick={() => setShowUserMenu(false)}
                      className="user-dropdown-item"
                    >
                      <span className="material-symbols-outlined text-[18px]">favorite</span>
                      <span>{t('wishlist')}</span>
                    </Link>
                    <Link 
                      to="/settings" 
                      onClick={() => setShowUserMenu(false)}
                      className="user-dropdown-item"
                    >
                      <span className="material-symbols-outlined text-[18px]">settings</span>
                      <span>{t('settings')}</span>
                    </Link>
                    <hr className="border-theme my-1" style={{ opacity: 0.3 }} />
                    <button 
                      onClick={handleLogout}
                      className="user-dropdown-item signout-btn"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      <span>{t('signOut')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link 
                to="/login" 
                className="btn-nav-signin"
              >
                {t('signIn')}
              </Link>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="bg-none border-none cursor-pointer text-base text-gray-300 hover:text-primary flex items-center p-1 transition-colors"
              title="Toggle Theme"
            >
              <span className="material-symbols-outlined text-[20px]">
                {theme === 'light' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar (Hidden on desktop) */}
      <div className="mobile-bottom-nav">
        <Link 
          to="/" 
          className={`flex flex-col items-center gap-1 text-xs font-semibold hover:text-primary transition-colors no-underline ${
            isLinkActive('/') ? 'text-primary font-bold' : 'text-gray-500'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">home</span>
          {t('home')}
        </Link>
        
        <Link 
          to="/products" 
          className={`flex flex-col items-center gap-1 text-xs font-semibold hover:text-primary transition-colors no-underline ${
            isLinkActive('/products') ? 'text-primary font-bold' : 'text-gray-500'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">storefront</span>
          {t('catalog')}
        </Link>

        {/* Cart Item Badge */}
        <Link 
          to="/cart" 
          className={`flex flex-col items-center gap-1 text-xs font-semibold hover:text-primary transition-colors no-underline ${
            isLinkActive('/cart') ? 'text-primary font-bold' : 'text-gray-500'
          }`}
        >
          <div className="relative flex items-center">
            <span className="material-symbols-outlined text-[24px]">shopping_cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#f43f5e] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                {cartCount}
              </span>
            )}
          </div>
          {t('cart')}
        </Link>
      </div>
    </Fragment>
  )
}

export default Navbar