import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCart } from '../services/CartContext'
import { useAuth, API_URL } from '../services/AuthContext'
import { useToast } from '../components/Toast'
import ProductDetailModal from '../components/ProductDetailModal'

function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { dispatch } = useCart()
  const { isAuthenticated, getAuthHeaders } = useAuth()
  const { addToast } = useToast()

  const [products, setProducts] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [recentlyViewed, setRecentlyViewed] = useState([])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const saved = JSON.parse(localStorage.getItem('recently_viewed')) || []
      setRecentlyViewed(saved)
    } catch (e) {
      console.error(e)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedProduct])

  const handleProductClick = (product) => {
    try {
      const current = JSON.parse(localStorage.getItem('recently_viewed')) || []
      const updated = [product, ...current.filter(p => p.id !== product.id)].slice(0, 8)
      localStorage.setItem('recently_viewed', JSON.stringify(updated))
      setRecentlyViewed(updated)
    } catch (e) {
      console.error(e)
    }
    setSelectedProduct(product)
  }

  // Derived category from search parameters
  const selectedCategory = searchParams.get('category') || 'all'

  // Sync local search query state with URL search param
  const urlSearch = searchParams.get('search') || ''
  const [searchQuery, setSearchQuery] = useState(urlSearch)
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch)

  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch)
    setSearchQuery(urlSearch)
  }

  const [sortBy, setSortBy] = useState('popular')
  const [priceRange, setPriceRange] = useState(1000)

  // Fetch products
  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => {
        setProducts(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching products:', err)
        setLoading(false)
      })
  }, [])

  // Fetch wishlist if authenticated
  useEffect(() => {
    if (!isAuthenticated) return
    fetch(`${API_URL}/api/wishlist`, {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setWishlist(data.map(p => p.id))
        }
      })
      .catch(err => console.error('Error fetching wishlist:', err))
  }, [isAuthenticated, getAuthHeaders])

  const activeWishlist = isAuthenticated ? wishlist : []

  const categories = [
    { value: 'all', label: 'All Categories', image: '/cat_all.png' },
    { value: 'electronics', label: 'Electronics', image: '/cat_electronics.png' },
    { value: 'jewelery', label: 'Jewelery', image: '/cat_jewelry.png' },
    { value: "men's clothing", label: "Men's Clothing", image: '/cat_men.png' },
    { value: "women's clothing", label: "Women's Clothing", image: '/cat_women.png' }
  ]

  const handleCategoryChange = (category) => {
    const newParams = new URLSearchParams(searchParams)
    if (category === 'all') {
      newParams.delete('category')
    } else {
      newParams.set('category', category)
    }
    setSearchParams(newParams)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const newParams = new URLSearchParams(searchParams)
    if (searchQuery.trim() === '') {
      newParams.delete('search')
    } else {
      newParams.set('search', searchQuery)
    }
    setSearchParams(newParams)
  }

  const handleToggleWishlist = async (e, productId) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      addToast('Please login to add items to your wishlist.', 'info')
      return
    }

    try {
      const res = await fetch(`${API_URL}/api/wishlist/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ productId })
      })
      if (!res.ok) throw new Error()
      
      const isFav = activeWishlist.includes(productId)
      if (isFav) {
        setWishlist(prev => prev.filter(id => id !== productId))
        addToast('Removed from wishlist.', 'info')
      } else {
        setWishlist(prev => [...prev, productId])
        addToast('Added to wishlist.', 'success')
      }
    } catch {
      addToast('Failed to update wishlist.', 'error')
    }
  }

  const handleAddToCart = (e, product) => {
    e.stopPropagation()
    dispatch({ type: 'ADD_ITEM', payload: product })
    addToast(`${product.title.substring(0, 20)}... added to cart!`, 'success')
  }

  // Filter & Sort Logic
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || 
      (product.category && product.category.toLowerCase() === selectedCategory.toLowerCase())
    
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesPrice = product.price <= priceRange

    return matchesCategory && matchesSearch && matchesPrice
  }).sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price
    if (sortBy === 'price-high') return b.price - a.price
    if (sortBy === 'rating') return (b.rating?.rate || 0) - (a.rating?.rate || 0)
    return a.id - b.id // Popular/default
  })

  return (
    <div className="app-container">
      <div className="animate-fade-in">
        {/* Page Header */}
      <div className="catalog-header-wrap">
        <div>
          <h1 className="catalog-title">Product Catalog</h1>
          <p className="catalog-subtitle">Discover premium goods curated for your style.</p>
        </div>

        {/* Search & Mobile Price */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '360px' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', width: '100%' }}>
            <input
              type="text"
              placeholder="Search catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)', borderRight: 'none', height: '42px' }}
            />
            <button
              type="submit"
              className="btn-primary"
              style={{ borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', padding: '0 16px', height: '42px' }}
            >
              Search
            </button>
          </form>
          
          <div className="mobile-price-filter">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Max Price</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>₹{priceRange.toLocaleString('en-IN')}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1000"
              step="10"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
          </div>
        </div>
      </div>

      <div className="products-layout">
        {/* Sidebar Filters */}
        <aside className="filter-sidebar">
          {/* Categories */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '16px' }}>
              Categories
            </h3>
            <div className="category-list">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  className="category-btn"
                  onClick={() => handleCategoryChange(cat.value)}
                  style={{
                    color: selectedCategory === cat.value ? 'var(--text-on-primary)' : 'var(--text-muted)',
                    background: selectedCategory === cat.value ? 'var(--primary)' : 'transparent',
                    fontWeight: selectedCategory === cat.value ? 600 : 500,
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCategory !== cat.value) e.currentTarget.style.background = 'var(--bg-input)'
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCategory !== cat.value) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <img 
                    src={cat.image} 
                    alt="" 
                    style={{ 
                      width: '24px', 
                      height: '24px', 
                      objectFit: 'contain', 
                      borderRadius: '50%',
                      background: '#fff',
                      padding: '2px',
                      border: '1px solid var(--border-glass)'
                    }} 
                  />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sort By */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '16px' }}>
              Sort By
            </h3>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-input"
              style={{ padding: '10px', fontWeight: 500, cursor: 'pointer' }}
            >
              <option value="popular">Popularity</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Customer Rating</option>
            </select>
          </div>

          {/* Filter Price */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                Max Price
              </h3>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>₹{priceRange.toLocaleString('en-IN')}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1000"
              step="10"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
          </div>
        </aside>

        {/* Products Grid */}
        <main>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '48px' }}>🔎</span>
              <h3 style={{ fontSize: '18px', marginTop: '16px' }}>No products found</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Try adjusting your filters, keywords, or price range.</p>
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map(product => {
                const isFav = activeWishlist.includes(product.id)
                const isOutOfStock = product.stock !== undefined && product.stock <= 0
                return (
                  <div
                    key={product.id}
                    className="glass-panel"
                    onClick={() => handleProductClick(product)}
                    style={{
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      background: 'var(--bg-card)',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      cursor: 'pointer',
                      height: '100%'
                    }}
                  >
                    {/* Stock Badge Overlay */}
                    {isOutOfStock && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'rgba(239, 68, 68, 0.95)',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        zIndex: 3,
                        textTransform: 'uppercase',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        No Stock
                      </div>
                    )}

                    {/* Wishlist Button */}
                    <button
                      onClick={(e) => handleToggleWishlist(e, product.id)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 3,
                        transition: 'transform var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: isFav ? 'var(--accent)' : 'var(--text-muted)', fontVariationSettings: isFav ? "'FILL' 1" : '' }}>
                        favorite
                      </span>
                    </button>

                    {/* Image Area */}
                    <div style={{ background: '#fff', borderRadius: 'var(--radius-sm)', padding: '12px', height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <img src={product.image} alt={product.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>

                    {/* Meta */}
                    <span style={{ color: 'var(--primary)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                      {product.category}
                    </span>
                    <h4 style={{
                      fontSize: '13px', margin: '0 0 8px', height: '38px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      lineHeight: 1.4, color: 'var(--text-main)'
                    }}>
                      {product.title}
                    </h4>

                    {/* Stars */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
                      <span style={{ color: 'var(--gold-dark)', fontSize: '14px' }}>★</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>{product.rating?.rate || '0.0'}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({product.rating?.count || 0})</span>
                    </div>

                    {/* Buy */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-main)' }}>₹{product.price.toLocaleString('en-IN')}</span>
                      {isOutOfStock ? (
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="btn-catalog-add"
                          style={{
                            background: 'var(--border-color)',
                            color: 'var(--text-muted)',
                            cursor: 'not-allowed',
                            opacity: 0.6
                          }}
                          disabled
                        >
                          No Stock
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleAddToCart(e, product)}
                          className="btn-catalog-add"
                        >
                          Add +
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {/* Recently Viewed Products Section */}
      {recentlyViewed.length > 0 && (
        <div className="mt-12 pt-8 border-t border-theme">
          <h2 className="text-xl font-bold text-main mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span> Recently Viewed Products
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
            {recentlyViewed.map(item => (
              <div 
                key={item.id} 
                onClick={() => setSelectedProduct(item)}
                className="glass-panel flex-shrink-0 w-48 p-3 rounded-xl cursor-pointer hover:border-primary transition-all group"
              >
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-32 object-contain rounded-lg bg-white/5 p-2 mb-2 group-hover:scale-105 transition-transform" 
                />
                <h4 className="text-xs font-semibold text-main truncate">{item.title}</h4>
                <p className="text-sm font-bold text-primary mt-1">₹{item.price?.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Embedded spinner styles */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      </div>
    </div>
  )
}

export default Products