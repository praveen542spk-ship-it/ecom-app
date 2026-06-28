import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../services/CartContext'
import { useToast } from '../components/Toast'
import { API_URL } from '../services/AuthContext'

function Cart() {
  const { cart, coupon, discountRate, dispatch } = useCart()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [couponInput, setCouponInput] = useState('')
  const [coupons, setCoupons] = useState([])
  const [showCouponModal, setShowCouponModal] = useState(false)

  // Fetch active coupons from database
  useEffect(() => {
    fetch(`${API_URL}/api/coupons`)
      .then(res => res.json())
      .then(data => setCoupons(data))
      .catch(err => console.error('Error fetching coupons:', err))
  }, [])

  // Save for Later state
  const [savedItems, setSavedItems] = useState(() => {
    try {
      const stored = localStorage.getItem('aura_saved_for_later')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Calculate pricing
  const subtotal = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0)
  const discount = subtotal * discountRate
  const shipping = subtotal >= 1000 || subtotal === 0 ? 0 : 99.00
  const tax = (subtotal - discount) * 0.08
  const total = subtotal - discount + shipping + tax

  const handleApplyCoupon = (e) => {
    e.preventDefault()
    const code = couponInput.trim().toUpperCase()
    if (!code) return

    const matchedCoupon = coupons.find(c => c.code === code)
    if (matchedCoupon) {
      dispatch({ type: 'APPLY_COUPON', payload: matchedCoupon })
      addToast(`Promo code "${code}" applied successfully!`, 'success')
      setCouponInput('')
    } else {
      addToast('Invalid promo code.', 'error')
    }
  }

  const handleRemoveItem = (itemId, title) => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId })
    addToast(`${title.substring(0, 20)}... removed from cart.`, 'info')
  }

  const handleSaveForLater = (item) => {
    dispatch({ type: 'REMOVE_ITEM', payload: item.id })
    const updated = [...savedItems.filter(i => i.id !== item.id), item]
    setSavedItems(updated)
    localStorage.setItem('aura_saved_for_later', JSON.stringify(updated))
    addToast(`"${item.title.substring(0, 20)}..." saved for later.`, 'success')
  }

  const handleMoveToCart = (item) => {
    dispatch({ type: 'ADD_ITEM', payload: item })
    const updated = savedItems.filter(i => i.id !== item.id)
    setSavedItems(updated)
    localStorage.setItem('aura_saved_for_later', JSON.stringify(updated))
    addToast(`"${item.title.substring(0, 20)}..." moved back to cart.`, 'success')
  }

  const handleRemoveSaved = (itemId, title) => {
    const updated = savedItems.filter(i => i.id !== itemId)
    setSavedItems(updated)
    localStorage.setItem('aura_saved_for_later', JSON.stringify(updated))
    addToast(`"${title.substring(0, 20)}..." removed from saved items.`, 'info')
  }

  if (cart.length === 0) {
    return (
      <div className="app-container animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '65vh' }}>
        <div style={{ textAlign: 'center', maxWidth: '440px' }}>
          <span style={{ fontSize: '72px', display: 'block', marginBottom: '20px' }}>🛒</span>
          <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Your Cart is Empty</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
            Looks like you haven't added anything to your cart yet. Explore our premium catalog to find amazing products!
          </p>
          <Link to="/products" className="btn-primary" style={{ display: 'inline-block' }}>
            Start Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container animate-fade-in">
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>Shopping Cart</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Review your items and proceed to secure checkout.</p>
      </div>

      {/* Free Shipping Progress Goal Bar */}
      <div className="glass-panel" style={{ 
        padding: '16px 20px', 
        borderRadius: 'var(--radius-md)', 
        background: 'var(--bg-card)', 
        border: '1px solid var(--border-color)',
        marginBottom: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {subtotal >= 1000 ? (
              <>
                <span style={{ color: 'var(--primary)', fontSize: '18px' }}>🎉</span>
                <span style={{ color: 'var(--text-main)' }}>You have unlocked <strong>FREE Shipping!</strong></span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '18px' }}>🚚</span>
                <span>
                  Add <strong style={{ color: 'var(--primary)' }}>₹{(1000 - subtotal).toFixed(2)}</strong> more to get <strong>FREE Shipping!</strong> (Current shipping: ₹99.00)
                </span>
              </>
            )}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
            ₹{Math.min(subtotal, 1000).toFixed(0)} / ₹1000
          </span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ 
            width: `${Math.min((subtotal / 1000) * 100, 100)}%`, 
            height: '100%', 
            background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)',
            borderRadius: '4px',
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: subtotal >= 1000 ? '0 0 10px var(--primary)' : 'none'
          }} />
        </div>
      </div>

      <div className="cart-grid">
        {/* Left Column: Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Cart Items ({cart.length})</h3>
              <button 
                onClick={() => {
                  dispatch({ type: 'CLEAR_CART' })
                  addToast('Cleared all items from your cart.', 'info')
                }}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
              >
                Clear Cart
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cart.map(item => (
                <div 
                  key={item.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px', 
                    paddingBottom: '16px', 
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    flexWrap: 'wrap'
                  }}
                >
                  {/* Item Image */}
                  <div style={{ width: '70px', height: '70px', background: 'white', borderRadius: 'var(--radius-sm)', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={item.image} alt={item.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>

                  {/* Title and Category */}
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>
                      {item.title}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', marginTop: '4px', display: 'inline-block' }}>
                      {item.category}
                    </span>
                  </div>

                  {/* Quantity Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', padding: '3px 8px' }}>
                    <button 
                      onClick={() => dispatch({ type: 'DECREMENT_ITEM', payload: item.id })}
                      style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '14px', fontWeight: 700, padding: '0 4px' }}
                    >
                      −
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{item.quantity || 1}</span>
                    <button 
                      onClick={() => dispatch({ type: 'INCREMENT_ITEM', payload: item.id })}
                      style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '14px', fontWeight: 700, padding: '0 4px' }}
                    >
                      +
                    </button>
                  </div>

                  {/* Pricing and Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '110px' }}>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-main)' }}>
                      ₹{(item.price * (item.quantity || 1)).toFixed(2)}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                      <button 
                        onClick={() => handleSaveForLater(item)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: 'var(--primary)', 
                          fontSize: '12px', 
                          cursor: 'pointer',
                          fontWeight: 600,
                          padding: 0
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        Save
                      </button>
                      <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '12px' }}>|</span>
                      <button 
                        onClick={() => handleRemoveItem(item.id, item.title)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: 'var(--text-muted)', 
                          fontSize: '12px', 
                          cursor: 'pointer',
                          padding: 0
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary Panel */}
        <div style={{ alignSelf: 'start' }}>
          <div className="glass-panel" style={{
            padding: '24px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', fontWeight: 700 }}>Order Summary</h3>
            
            {/* Promo Code Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text"
                  placeholder="Promo Code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="form-input"
                  style={{ padding: '8px 12px', fontSize: '13px', height: '38px' }}
                />
                <button 
                  type="submit" 
                  className="btn-secondary"
                  style={{ padding: '0 16px', fontSize: '13px', height: '38px', fontWeight: 600 }}
                >
                  Apply
                </button>
              </form>
              <button
                type="button"
                onClick={() => setShowCouponModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  textDecoration: 'underline',
                  padding: 0,
                  marginTop: '4px',
                  width: 'fit-content'
                }}
              >
                🎟️ View Available Coupons
              </button>
            </div>

            {coupon && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--secondary-glow)', border: '1px dashed var(--secondary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                <span style={{ fontWeight: 600 }}>🏷️ "{coupon}" applied</span>
                <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>{(discountRate * 100)}% Off</span>
              </div>
            )}

            {/* Price list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                <span style={{ color: 'var(--text-main)' }}>₹{subtotal.toFixed(2)}</span>
              </div>
              
              {discountRate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                  <span>Promo Discount</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Shipping</span>
                <span>{shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tax (8%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>

              <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700 }}>
                <span>Grand Total</span>
                <span className="gradient-text">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button 
              onClick={() => navigate('/checkout')}
              className="btn-primary" 
              style={{ 
                width: '100%', 
                padding: '14px', 
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}
            >
              Proceed to Checkout
            </button>
            
            <Link 
              to="/products" 
              style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>

      {/* Saved for Later Section */}
      {savedItems.length > 0 && (
        <div style={{ marginTop: '48px', borderTop: '1px solid var(--border-color)', paddingTop: '32px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💾</span> Saved for Later ({savedItems.length})
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '20px' 
          }}>
            {savedItems.map(item => (
              <div 
                key={item.id} 
                className="glass-panel" 
                style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  padding: '16px', 
                  borderRadius: 'var(--radius-md)', 
                  background: 'var(--bg-card)',
                  alignItems: 'center'
                }}
              >
                <div style={{ width: '60px', height: '60px', background: 'white', borderRadius: 'var(--radius-sm)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src={item.image} alt={item.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>
                    {item.title}
                  </h4>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', display: 'block', marginTop: '4px' }}>
                    ₹{item.price.toFixed(2)}
                  </span>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button 
                      onClick={() => handleMoveToCart(item)}
                      className="btn-catalog-add"
                      style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}
                    >
                      Move to Cart
                    </button>
                    <button 
                      onClick={() => handleRemoveSaved(item.id, item.title)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coupon Selector Modal */}
      {showCouponModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10, 10, 15, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '400px',
            padding: '30px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Available Coupons</h3>
              <button 
                onClick={() => setShowCouponModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer', padding: '4px' }}
              >
                &times;
              </button>
            </div>

            {coupons.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>No active coupons available at this time.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                {coupons.map((c, idx) => (
                  <div 
                    key={idx}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div>
                      <span style={{
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                        color: 'var(--text-on-primary)',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        letterSpacing: '0.05em'
                      }}>
                        {c.code}
                      </span>
                      <p style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: 600, marginTop: '8px', marginBottom: 0 }}>
                        Save {(c.discountRate * 100)}% on your order
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        dispatch({ type: 'APPLY_COUPON', payload: c })
                        addToast(`Coupon "${c.code}" applied!`, 'success')
                        setShowCouponModal(false)
                      }}
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700 }}
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Cart