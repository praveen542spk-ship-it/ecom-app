import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../services/CartContext'
import { useAuth, API_URL } from '../services/AuthContext'
import { useToast } from './Toast'

function ProductDetailModal({ product, onClose }) {
  const { dispatch } = useCart()
  const { isAuthenticated, getAuthHeaders } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const modalRef = useRef(null)

  const [activeProduct, setActiveProduct] = useState(product)
  const [quantity, setQuantity] = useState(1)
  const [reviews, setReviews] = useState([])
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Flipkart/Amazon UI upgrade states
  const [activeThumbnailIndex, setActiveThumbnailIndex] = useState(0)
  const [pincode, setPincode] = useState('')
  const [pincodeStatus, setPincodeStatus] = useState(null) // null, 'invalid', 'express', 'standard'
  const [estimatedDate, setEstimatedDate] = useState('')
  const [similarProducts, setSimilarProducts] = useState([])
  const [similarFetchError, setSimilarFetchError] = useState(null)

  const productId = activeProduct ? activeProduct.id : null

  // Disable body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // Sync state cleanly when product prop changes
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (product) {
      setActiveProduct(product)
      setActiveThumbnailIndex(0)
      setQuantity(1)
      setPincode('')
      setPincodeStatus(null)
      setSimilarFetchError(null)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [product])

  // Scroll modal back to top when activeProduct changes
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.scrollTop = 0
    }
  }, [activeProduct])

  // Fetch reviews on mount or when activeProduct changes
  useEffect(() => {
    if (!productId) return
    fetch(`${API_URL}/api/products/${productId}`)
      .then(res => res.json())
      .then(data => {
        if (data.reviews) {
          setReviews(data.reviews)
        }
      })
      .catch(err => console.error('Error fetching reviews:', err))
  }, [productId])

  // Fetch similar products
  useEffect(() => {
    if (!activeProduct?.id) return
    fetch(`${API_URL}/api/products`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        if (!Array.isArray(data)) {
          throw new Error('Response is not an array')
        }
        const filtered = data.filter(p => {
          const matchCategory = p.category && activeProduct.category && 
            p.category.toLowerCase().trim() === activeProduct.category.toLowerCase().trim();
          const matchId = Number(p.id) !== Number(activeProduct.id);
          return matchCategory && matchId;
        })
        setSimilarProducts(filtered.slice(0, 4))
        setSimilarFetchError(null)
      })
      .catch(err => {
        console.error('Error fetching similar products:', err)
        setSimilarFetchError(err.message || String(err))
      })
  }, [activeProduct])

  if (!activeProduct) return null

  // Aggregate Rating calculations
  const aggregateRating = reviews.length > 0
    ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
    : activeProduct.rating?.rate || 0.0

  const totalReviewsCount = reviews.length > 0 ? reviews.length : activeProduct.rating?.count || 0

  // Calculate review percentage distributions
  const getRatingDistribution = () => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    
    if (reviews.length > 0) {
      reviews.forEach(r => {
        if (counts[r.rating] !== undefined) counts[r.rating]++
      })
      Object.keys(counts).forEach(k => {
        counts[k] = Math.round((counts[k] / reviews.length) * 100)
      })
    } else {
      const baseRating = Math.round(aggregateRating)
      if (baseRating === 5) {
        counts[5] = 72; counts[4] = 18; counts[3] = 6; counts[2] = 2; counts[1] = 2
      } else if (baseRating === 4) {
        counts[5] = 55; counts[4] = 25; counts[3] = 12; counts[2] = 5; counts[1] = 3
      } else {
        counts[5] = 30; counts[4] = 30; counts[3] = 20; counts[2] = 10; counts[1] = 10
      }
    }
    return counts
  }

  const ratingDistribution = getRatingDistribution()

  // Dynamic image variations filters representation (Thumbnails)
  const thumbnails = [
    { label: 'Standard', filter: 'none' },
    { label: 'Variant Emerald', filter: 'hue-rotate(90deg) saturate(1.2)' },
    { label: 'Variant Ruby', filter: 'hue-rotate(240deg) brightness(0.95)' },
    { label: 'Variant Gold', filter: 'hue-rotate(45deg) saturate(1.5)' }
  ]

  const renderStars = (rateValue, size = '16px') => {
    const stars = []
    const floorRating = Math.floor(rateValue)
    const hasHalf = rateValue % 1 >= 0.4

    for (let i = 1; i <= 5; i++) {
      if (i <= floorRating) {
        stars.push(<span key={i} style={{ color: 'var(--gold-dark)', fontSize: size }}>★</span>)
      } else if (i === floorRating + 1 && hasHalf) {
        stars.push(<span key={i} style={{ color: 'var(--gold-dark)', fontSize: size }}>⯪</span>)
      } else {
        stars.push(<span key={i} style={{ color: 'var(--text-muted)', opacity: 0.3, fontSize: size }}>★</span>)
      }
    }
    return stars
  }

  const handleAddToCart = () => {
    if (activeProduct.stock !== undefined && activeProduct.stock <= 0) {
      addToast('Sorry, this product is out of stock.', 'error')
      return
    }
    const variantLabel = activeThumbnailIndex > 0 ? ` (${thumbnails[activeThumbnailIndex].label})` : ''
    const itemWithVariant = {
      ...activeProduct,
      title: activeProduct.title + variantLabel,
      image_filter: thumbnails[activeThumbnailIndex].filter
    }
    
    for (let i = 0; i < quantity; i++) {
      dispatch({ type: 'ADD_ITEM', payload: itemWithVariant })
    }
    addToast(`Added ${quantity}x ${itemWithVariant.title.substring(0, 20)}... to cart!`, 'success')
    onClose()
  }

  const handleBuyNow = () => {
    if (activeProduct.stock !== undefined && activeProduct.stock <= 0) {
      addToast('Sorry, this product is out of stock.', 'error')
      return
    }
    const variantLabel = activeThumbnailIndex > 0 ? ` (${thumbnails[activeThumbnailIndex].label})` : ''
    const itemWithVariant = {
      ...activeProduct,
      title: activeProduct.title + variantLabel,
      image_filter: thumbnails[activeThumbnailIndex].filter,
      quantity: quantity
    }
    
    localStorage.setItem('buy_now_item', JSON.stringify(itemWithVariant))
    localStorage.setItem('is_buy_now', 'true')
    addToast('Redirecting to secure checkout...', 'success')
    onClose()
    navigate('/checkout?buyNow=true')
  }

  const handlePincodeCheck = (e) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeStatus('invalid')
      return
    }

    const firstDigit = pincode.charAt(0)
    const isExpress = ['1', '4', '6'].includes(firstDigit)
    setPincodeStatus(isExpress ? 'express' : 'standard')

    const daysToAdd = isExpress ? 1 : 3
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysToAdd)
    const options = { weekday: 'long', month: 'short', day: 'numeric' }
    setEstimatedDate(targetDate.toLocaleDateString('en-US', options))
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) return

    setSubmittingReview(true)
    try {
      const res = await fetch(`${API_URL}/api/products/${activeProduct.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ rating: newRating, comment: newComment })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to submit review')
      
      setReviews(prev => [...prev, data])
      setNewComment('')
      setNewRating(5)
      addToast('Review submitted successfully!', 'success')
    } catch (err) {
      addToast(err.message || 'Error submitting review.', 'error')
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(8, 10, 18, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(8px)',
        padding: '20px',
        overflowY: 'auto'
      }} 
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 'var(--radius-md)',
          padding: '28px',
          position: 'relative',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px', right: '16px',
            background: 'var(--bg-input)',
            border: 'none',
            fontSize: '20px',
            color: 'var(--text-main)',
            cursor: 'pointer',
            width: '34px', height: '34px',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all var(--transition-fast)',
            zIndex: 10
          }}
        >
          &times;
        </button>

        {/* Modal Core Layout */}
        <div className="modal-content-grid">
          
          {/* Column 1: Image Gallery (Flipkart Style) */}
          <div style={{ display: 'flex', gap: '14px' }}>
            
            {/* Gallery Thumbnails list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {thumbnails.map((thumb, idx) => (
                <div 
                  key={idx}
                  onClick={() => setActiveThumbnailIndex(idx)}
                  style={{
                    width: '46px',
                    height: '52px',
                    border: `2px solid ${activeThumbnailIndex === idx ? 'var(--accent)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '3px',
                    cursor: 'pointer',
                    background: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  <img 
                    src={activeProduct.image} 
                    alt="" 
                    style={{ 
                      maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                      filter: thumb.filter 
                    }} 
                  />
                </div>
              ))}
            </div>

            {/* Main Image View */}
            <div style={{
              background: '#fff',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '24px',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '280px',
              maxHeight: '350px'
            }}>
              <img 
                src={activeProduct.image} 
                alt={activeProduct.title} 
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  filter: thumbnails[activeThumbnailIndex].filter,
                  transition: 'filter 0.2s ease'
                }} 
              />
            </div>
          </div>

          {/* Column 2: Amazon Style Product Details */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Brand: {activeProduct.category}
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', margin: '4px 0 8px', lineHeight: 1.3 }}>
              {activeProduct.title} {activeThumbnailIndex > 0 && ` - ${thumbnails[activeThumbnailIndex].label}`}
            </h2>

            {/* Star Rating Summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ display: 'flex' }}>
                {renderStars(aggregateRating)}
              </div>
              <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 700 }}>
                {aggregateRating} out of 5
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                ({totalReviewsCount} customer ratings)
              </span>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', marginBottom: '14px' }} />

            {/* Price section */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
              <span style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 600 }}>Deal</span>
              <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)' }}>
                ₹{activeProduct.price.toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                ₹{(activeProduct.price * 1.3).toFixed(2)}
              </span>
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
                (Save 30% Off)
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
              {activeProduct.description}
            </p>

            {/* Simulated Pincode Checker (Flipkart style) */}
            <div className="glass-panel" style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              marginBottom: '20px',
              background: 'var(--bg-input)'
            }}>
              <form onSubmit={handlePincodeCheck} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px' }}>📍</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Delivery Details:</span>
                <input 
                  type="text" 
                  placeholder="Enter 6-digit Pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  style={{
                    padding: '6px 8px', border: '1px solid var(--border-color)',
                    borderRadius: '3px', width: '140px', fontSize: '13px'
                  }}
                />
                <button type="submit" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  Check
                </button>
              </form>

              {pincodeStatus && (
                <div style={{ marginTop: '8px', fontSize: '13px' }}>
                  {pincodeStatus === 'invalid' && (
                    <span style={{ color: 'red', fontWeight: 600 }}>❌ Please enter a valid 6-digit Pincode.</span>
                  )}
                  {pincodeStatus === 'express' && (
                    <span style={{ color: '#10b981', fontWeight: 700 }}>
                      ⚡ Super Express Delivery: Available! Arriving by <strong style={{ color: 'var(--text-main)' }}>{estimatedDate}</strong>.
                    </span>
                  )}
                  {pincodeStatus === 'standard' && (
                    <span style={{ color: 'var(--text-main)' }}>
                      🚚 Standard Shipping: Available. Arriving in 2-3 Days on <strong style={{ color: 'var(--text-main)' }}>{estimatedDate}</strong>.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Stock Status Indicator */}
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: 700,
                color: activeProduct.stock !== undefined && activeProduct.stock <= 0 ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: activeProduct.stock !== undefined && activeProduct.stock <= 0 ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)',
                  display: 'inline-block'
                }}></span>
                {activeProduct.stock !== undefined && activeProduct.stock <= 0 
                  ? 'No Stock / Out of Stock' 
                  : `In Stock (Only ${activeProduct.stock || 0} left)`}
              </span>
            </div>

            {/* Quantity and Dual Cart/Buy Now buttons (Flipkart style) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'auto', flexWrap: 'wrap' }}>
              <select 
                value={quantity} 
                onChange={(e) => setQuantity(Number(e.target.value))}
                disabled={activeProduct.stock !== undefined && activeProduct.stock <= 0}
                style={{
                  height: '44px', padding: '0 8px',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface)', color: 'var(--text-main)',
                  fontWeight: 600, cursor: activeProduct.stock !== undefined && activeProduct.stock <= 0 ? 'not-allowed' : 'pointer',
                  opacity: activeProduct.stock !== undefined && activeProduct.stock <= 0 ? 0.6 : 1
                }}
              >
                {activeProduct.stock !== undefined && activeProduct.stock <= 0 ? (
                  <option value={0}>Qty: 0</option>
                ) : (
                  Array.from({ length: Math.min(5, activeProduct.stock || 0) }, (_, i) => i + 1).map(v => (
                    <option key={v} value={v}>Qty: {v}</option>
                  ))
                )}
              </select>

              <button
                className="btn-secondary"
                onClick={activeProduct.stock !== undefined && activeProduct.stock <= 0 ? null : handleAddToCart}
                disabled={activeProduct.stock !== undefined && activeProduct.stock <= 0}
                style={{ 
                  flex: 1, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: activeProduct.stock !== undefined && activeProduct.stock <= 0 ? 'var(--border-color)' : 'var(--bg-input)', 
                  border: '1px solid var(--border-color)', 
                  color: activeProduct.stock !== undefined && activeProduct.stock <= 0 ? 'var(--text-muted)' : 'var(--text-main)',
                  fontWeight: 700, 
                  cursor: activeProduct.stock !== undefined && activeProduct.stock <= 0 ? 'not-allowed' : 'pointer', 
                  borderRadius: 'var(--radius-sm)', 
                  transition: 'background var(--transition-fast)',
                  opacity: activeProduct.stock !== undefined && activeProduct.stock <= 0 ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!(activeProduct.stock !== undefined && activeProduct.stock <= 0)) e.currentTarget.style.background = 'var(--bg-surface)';
                }}
                onMouseLeave={(e) => {
                  if (!(activeProduct.stock !== undefined && activeProduct.stock <= 0)) e.currentTarget.style.background = 'var(--bg-input)';
                }}
              >
                Add to Cart
              </button>

              <button
                className="btn-primary"
                onClick={activeProduct.stock !== undefined && activeProduct.stock <= 0 ? null : handleBuyNow}
                disabled={activeProduct.stock !== undefined && activeProduct.stock <= 0}
                style={{ 
                  flex: 1, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: activeProduct.stock !== undefined && activeProduct.stock <= 0 ? 'var(--border-color)' : '#ff9f00', 
                  border: activeProduct.stock !== undefined && activeProduct.stock <= 0 ? '1px solid var(--border-color)' : '1px solid #f68f00', 
                  color: activeProduct.stock !== undefined && activeProduct.stock <= 0 ? 'var(--text-muted)' : '#111',
                  fontWeight: 700, 
                  cursor: activeProduct.stock !== undefined && activeProduct.stock <= 0 ? 'not-allowed' : 'pointer', 
                  borderRadius: 'var(--radius-sm)', 
                  transition: 'background var(--transition-fast)',
                  opacity: activeProduct.stock !== undefined && activeProduct.stock <= 0 ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!(activeProduct.stock !== undefined && activeProduct.stock <= 0)) e.currentTarget.style.background = '#f59200';
                }}
                onMouseLeave={(e) => {
                  if (!(activeProduct.stock !== undefined && activeProduct.stock <= 0)) e.currentTarget.style.background = '#ff9f00';
                }}
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)' }} />

        {/* --- Amazon Rating Breakdown Bar Chart & Reviews --- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px', flexWrap: 'wrap' }}>
          
          {/* Left Sub-column: Ratings breakdown chart */}
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Customer Ratings</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex' }}>
                {renderStars(aggregateRating, '20px')}
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>{aggregateRating} out of 5</span>
            </div>

            {/* Horizontal Bar Chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="review-progress-bar-container">
                  <span style={{ width: '40px' }}>{stars} star</span>
                  <div className="review-progress-bar-track">
                    <div 
                      className="review-progress-bar-fill"
                      style={{ width: `${ratingDistribution[stars]}%` }}
                    />
                  </div>
                  <span style={{ width: '36px', textAlign: 'right' }}>{ratingDistribution[stars]}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Sub-column: Reviews list & Form */}
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Customer Reviews</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px', maxHeight: '300px', overflowY: 'auto' }}>
              {reviews.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                  No customer reviews yet. Be the first to share your experience!
                </p>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} style={{
                    padding: '12px', borderRadius: '4px',
                    background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                    display: 'flex', flexDirection: 'column', gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justify: 'space-between', fontSize: '12px' }}>
                      <span style={{ fontWeight: 700 }}>{rev.userName}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{rev.date}</span>
                    </div>
                    <div style={{ display: 'flex' }}>{renderStars(rev.rating)}</div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{rev.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Review form */}
            {isAuthenticated ? (
              <form onSubmit={handleReviewSubmit} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                padding: '16px', borderRadius: 'var(--radius-sm)',
                display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Review this product</h4>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Select Star Rating</span>
                  <div style={{ display: 'flex', gap: '4px', fontSize: '18px', cursor: 'pointer' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span 
                        key={star} 
                        onClick={() => setNewRating(star)}
                        style={{ color: star <= newRating ? 'var(--gold-dark)' : 'var(--text-muted)' }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <textarea 
                    required
                    rows="2"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="form-input"
                    style={{ resize: 'vertical', fontSize: '13px', padding: '10px' }}
                    placeholder="Share feedback on product quality, shipping and packing..."
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn-secondary" 
                  disabled={submittingReview}
                  style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px' }}
                >
                  {submittingReview ? 'Submitting...' : 'Write Review'}
                </button>
              </form>
            ) : (
              <div style={{
                padding: '16px', borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--border-color)', background: 'var(--bg-input)',
                textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)'
              }}>
                Please{' '}
                <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>
                  sign in
                </Link>{' '}
                to leave a review.
              </div>
            )}
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

        {/* --- Similar Products Section --- */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Similar Products</h3>
          {similarFetchError ? (
            <p style={{ color: 'red', fontSize: '13px', fontStyle: 'italic' }}>Failed to load similar products. Please check your connection.</p>
          ) : similarProducts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>No similar products found in this category.</p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '20px'
            }}>
              {similarProducts.map(item => (
                <div 
                  key={item.id}
                  onClick={() => {
                    setActiveProduct(item)
                    setActiveThumbnailIndex(0)
                    setSimilarFetchError(null)
                  }}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px',
                    cursor: 'pointer',
                    background: 'var(--bg-surface)',
                    display: 'flex', flexDirection: 'column',
                    transition: 'transform var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{ height: '100px', background: 'white', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                    <img src={item.image} alt={item.title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>
                  <h4 style={{
                    fontSize: '12px', fontWeight: 600, height: '34px', overflow: 'hidden',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    lineHeight: 1.4, color: 'var(--text-main)', marginBottom: '4px'
                  }}>
                    {item.title}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--gold-dark)', fontSize: '12px' }}>★</span>
                    <span style={{ fontSize: '11px', fontWeight: 700 }}>{item.rating?.rate || '0.0'}</span>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--accent)', marginTop: 'auto' }}>₹{item.price.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- Frequently Bought Together Section (Amazon Style) --- */}
        {similarProducts.length > 0 && (
          <div style={{ marginTop: '32px', padding: '20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined text-primary">layers</span> Frequently Bought Together
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '80px', height: '80px', background: 'white', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={activeProduct.image} alt={activeProduct.title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                </div>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-muted)' }}>+</span>
                <div style={{ width: '80px', height: '80px', background: 'white', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={similarProducts[0].image} alt={similarProducts[0].title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Total Price: <span style={{ color: 'var(--primary)', fontSize: '18px', fontWeight: 800 }}>₹{(activeProduct.price + similarProducts[0].price).toLocaleString('en-IN')}</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Save 10% when bought as a bundle!</p>
              </div>
              <button 
                onClick={() => {
                  dispatch({ type: 'ADD_ITEM', payload: activeProduct })
                  dispatch({ type: 'ADD_ITEM', payload: similarProducts[0] })
                  addToast('Bundle added to cart!', 'success')
                }}
                className="btn-primary" 
                style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 700 }}
              >
                Add Both to Cart
              </button>
            </div>
          </div>
        )}

        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

        {/* --- Customer Q&A Section --- */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined text-primary">help_outline</span> Customer Questions & Answers
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', margin: 0 }}>Q: Is warranty included with this product?</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', margin: 0 }}>A: Yes, all AuraShop items come with a 1-year brand warranty card included in the box.</p>
            </div>
            <div style={{ padding: '14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', margin: 0 }}>Q: What is the estimated delivery timeframe?</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', margin: 0 }}>A: Standard shipping takes 3-5 business days across India.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ProductDetailModal
