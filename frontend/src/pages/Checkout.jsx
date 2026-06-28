import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCart } from '../services/CartContext'
import { useAuth, API_URL } from '../services/AuthContext'
import { useToast } from '../components/Toast'

function Checkout() {
  const { cart, coupon, discountRate, dispatch } = useCart()
  const { user, token, getAuthHeaders } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isBuyNow = searchParams.get('buyNow') === 'true'
  const buyNowItem = (() => {
    if (isBuyNow) {
      const stored = localStorage.getItem('buy_now_item')
      return stored ? JSON.parse(stored) : null
    }
    return null
  })()

  const [addresses, setAddresses] = useState([])
  const [selectedAddrId, setSelectedAddrId] = useState('new')
  const [saveToProfile, setSaveToProfile] = useState(false)
  const [paymentSubMethod, setPaymentSubMethod] = useState('cod') // 'cod', 'upi', 'card', 'netbank'
  const [upiId, setUpiId] = useState('6374060801@ibl')
  
  // Card states
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' })
  const [isCardFlipped, setIsCardFlipped] = useState(false)
  
  // OTP states
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [otpValue, setOtpValue] = useState('')
  const [targetOtp] = useState(() => Math.floor(100000 + Math.random() * 900000).toString())
  
  // UPI Pin Modal (for direct authentication)
  const [showUpiPinModal, setShowUpiPinModal] = useState(false)
  const [upiPinValue, setUpiPinValue] = useState('')

  // Net banking states
  const [selectedBank, setSelectedBank] = useState('')
  const [showNetBankModal, setShowNetBankModal] = useState(false)
  const [netBankUserId, setNetBankUserId] = useState('')
  const [netBankPassword, setNetBankPassword] = useState('')

  // COD Captcha states
  const [codCaptchaCode, setCodCaptchaCode] = useState(() => Math.floor(100 + Math.random() * 900).toString())
  const [typedCaptchaCode, setTypedCaptchaCode] = useState('')
  const [tempOrderId] = useState(() => `AUR-ORD-${Math.floor(100000 + Math.random() * 900000)}`)

  const [formData, setFormData] = useState({
    name: '', email: '', address: '', city: '', zip: '', phone: ''
  })
  const [isAuthorizing, setIsAuthorizing] = useState(false)

  // Fetch payment config on mount
  useEffect(() => {
    fetch(`${API_URL}/api/config`)
      .then(res => res.json())
      .then(data => {
        if (data.upiId) {
          setUpiId(data.upiId)
        }
      })
      .catch(err => console.error('Error fetching payment config:', err))
  }, [])

  // Redirect if not logged in or cart/buyNowItem is empty
  useEffect(() => {
    if (!token) {
      addToast('Please login to checkout.', 'info')
      navigate('/login')
    } else if (!isBuyNow && cart.length === 0) {
      addToast('Your cart is empty. Cannot checkout!', 'info')
      navigate('/products')
    } else if (isBuyNow && !localStorage.getItem('buy_now_item')) {
      addToast('No Buy Now item found. Redirecting to catalog.', 'info')
      navigate('/products')
    }
  }, [token, cart.length, isBuyNow, navigate, addToast])

  // Fetch saved addresses
  useEffect(() => {
    if (!token) return
    fetch(`${API_URL}/api/addresses`, {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        setAddresses(Array.isArray(data) ? data : [])
        if (Array.isArray(data) && data.length > 0) {
          // Pre-select first address
          setSelectedAddrId(data[0].id)
          setFormData({
            name: data[0].name,
            email: user?.email || '',
            address: data[0].address,
            city: data[0].city,
            zip: data[0].zip,
            phone: data[0].phone || ''
          })
        } else {
          // Pre-fill user details if no saved addresses
          setFormData(prev => ({
            ...prev,
            name: user?.name || '',
            email: user?.email || ''
          }))
        }
      })
      .catch(err => console.error('Error fetching addresses:', err))
  }, [token, getAuthHeaders, user])

  const refreshCaptcha = () => {
    setCodCaptchaCode(Math.floor(100 + Math.random() * 900).toString())
    setTypedCaptchaCode('')
  }

  const handleCardNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 16) val = val.slice(0, 16)
    const formatted = val.match(/.{1,4}/g)?.join(' ') || val
    setCardData(prev => ({ ...prev, number: formatted }))
  }

  const handleCardExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 4) val = val.slice(0, 4)
    if (val.length > 2) {
      val = val.slice(0, 2) + '/' + val.slice(2)
    }
    setCardData(prev => ({ ...prev, expiry: val }))
  }

  const handleCardCvvChange = (e) => {
    const val = e.target.value.replace(/\D/g, '')
    if (val.length > 3) return
    setCardData(prev => ({ ...prev, cvv: val }))
  }

  const handleCardNameChange = (e) => {
    setCardData(prev => ({ ...prev, name: e.target.value }))
  }

  // Define checkout items (single item for Buy Now, entire cart otherwise)
  const checkoutItems = isBuyNow ? (buyNowItem ? [buyNowItem] : []) : cart

  // Calculate prices
  const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0)
  const discount = subtotal * discountRate
  const shipping = subtotal >= 1000 || subtotal === 0 ? 0 : 99.00
  const tax = (subtotal - discount) * 0.08
  const total = subtotal - discount + shipping + tax

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddressSelect = (e) => {
    const id = e.target.value
    setSelectedAddrId(id)
    if (id === 'new') {
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        address: '',
        city: '',
        zip: '',
        phone: ''
      })
    } else {
      const selected = addresses.find(a => a.id === id)
      if (selected) {
        setFormData({
          name: selected.name,
          email: user?.email || '',
          address: selected.address,
          city: selected.city,
          zip: selected.zip,
          phone: selected.phone || ''
        })
      }
    }
  }

  const submitDirectOrder = async (finalMethod, transactionId = '') => {
    setIsAuthorizing(true)
    try {
      // If 'Save this address' is selected (and it's a new address), save it to the backend first
      if (selectedAddrId === 'new' && saveToProfile) {
        await fetch(`${API_URL}/api/addresses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            name: formData.name,
            address: formData.address,
            city: formData.city,
            zip: formData.zip,
            phone: formData.phone
          })
        })
      }

      // Call API to create direct order
      const res = await fetch(`${API_URL}/api/payment/create-direct-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          orderId: tempOrderId,
          cartItems: checkoutItems,
          shippingAddress: formData,
          discountRate: discountRate,
          paymentMethod: finalMethod,
          transactionId: transactionId || `TXN-${Math.floor(100000 + Math.random() * 900000)}`
        })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit order.')

      // Save checkout items and is_buy_now flag to localStorage for CheckoutSuccess verification
      localStorage.setItem('checkout_items', JSON.stringify(checkoutItems))
      localStorage.setItem('is_buy_now', isBuyNow ? 'true' : 'false')

      if (isBuyNow) {
        localStorage.removeItem('buy_now_item')
      } else {
        dispatch({ type: 'CLEAR_CART' })
      }
      
      if (finalMethod === 'upi') {
        addToast(`AuraSecure: Payment of ₹${total.toFixed(2)} successfully transferred to Praveen (${upiId})!`, 'success')
      } else {
        addToast('Order confirmed successfully!', 'success')
      }
      
      // Close all modals
      setShowOtpModal(false)
      setShowUpiPinModal(false)
      setShowNetBankModal(false)

      navigate(`/checkout-success?session_id=${data.order.sessionId}&userId=${user.id}&mock=true`)
    } catch (err) {
      console.error(err)
      addToast(err.message || 'Error submitting order.', 'error')
    } finally {
      setIsAuthorizing(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (checkoutItems.length === 0) {
      addToast('Your checkout items list is empty. Cannot checkout!', 'error')
      return
    }

    if (paymentSubMethod === 'cod') {
      if (typedCaptchaCode !== codCaptchaCode) {
        addToast('Error: Captcha verification failed. Please enter the correct code.', 'error')
        refreshCaptcha()
        return
      }
      submitDirectOrder('cod', 'COD (Pending delivery)')
    } else if (paymentSubMethod === 'card') {
      // Validate card fields - COMPULSORY
      const cleanNum = cardData.number.replace(/\s/g, '')
      if (!cleanNum) {
        addToast('Error: Card Number is compulsory. Please fill out this field.', 'error')
        return
      }
      if (cleanNum.length !== 16 || !/^\d+$/.test(cleanNum)) {
        addToast('Error: Invalid card number. Must be exactly 16 digits.', 'error')
        return
      }
      
      if (!cardData.name.trim()) {
        addToast('Error: Cardholder Name is compulsory. Please fill out this field.', 'error')
        return
      }
      if (cardData.name.trim().length < 3) {
        addToast('Error: Invalid Cardholder Name. Must be at least 3 characters.', 'error')
        return
      }

      if (!cardData.expiry) {
        addToast('Error: Expiry Date is compulsory. Please fill out this field.', 'error')
        return
      }
      if (!/^\d{2}\/\d{2}$/.test(cardData.expiry)) {
        addToast('Error: Invalid expiry date format. Use MM/YY.', 'error')
        return
      }
      const [expMonth, expYear] = cardData.expiry.split('/')
      const m = parseInt(expMonth, 10)
      const y = parseInt(expYear, 10)
      if (isNaN(m) || m < 1 || m > 12) {
        addToast('Error: Invalid Expiry Month. Must be between 01 and 12.', 'error')
        return
      }
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear() % 100 // 26
      const currentMonth = currentDate.getMonth() + 1 // 6
      if (isNaN(y) || y < currentYear) {
        addToast(`Error: Invalid Expiry Year. Must be ${currentYear} (20${currentYear}) or later.`, 'error')
        return
      }
      if (y === currentYear && m < currentMonth) {
        addToast('Error: Invalid Expiry Month. The card has expired.', 'error')
        return
      }

      if (!cardData.cvv) {
        addToast('Error: CVV is compulsory. Please fill out this field.', 'error')
        return
      }
      if (cardData.cvv.length !== 3 || !/^\d+$/.test(cardData.cvv)) {
        addToast('Error: Invalid CVV. Must be exactly 3 digits.', 'error')
        return
      }

      // Trigger OTP Modal
      setShowOtpModal(true)
      addToast(`AuraSecure: Verification code sent to +91 ******${formData.phone ? formData.phone.slice(-4) : '9822'}`, 'info')
    } else if (paymentSubMethod === 'netbank') {
      if (!selectedBank) {
        addToast('Error: Please select your bank for Net Banking.', 'error')
        return
      }
      // Reset Net Banking Inputs on open
      setNetBankUserId('')
      setNetBankPassword('')
      setShowNetBankModal(true)
    } else if (paymentSubMethod === 'upi') {
      // Direct open secure UPI PIN entry modal (like GP/PP redirect)
      setUpiPinValue('')
      setShowUpiPinModal(true)
    }
  }

  return (
    <div className="app-container animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', margin: '0 0 8px', fontWeight: 800 }}>Secure Checkout</h1>
        <p style={{ color: 'var(--text-muted)' }}>Provide shipment details and select payment method to finalize your order.</p>
      </div>

      <form onSubmit={handleSubmit} className="cart-grid">
        {/* Left Column: Shipment Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Address Selection Option (Amazon Style) */}
          <div className="glass-panel" style={{ padding: '32px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', fontWeight: 700 }}>
              1. Delivery Address Book
            </h3>
            
            {addresses.length > 0 && (
              <div className="form-group">
                <label htmlFor="addressSelect" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                  Select from Saved Addresses
                </label>
                <select 
                  id="addressSelect"
                  value={selectedAddrId} 
                  onChange={handleAddressSelect}
                  style={{
                    width: '100%', padding: '12px', border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)', color: 'var(--text-main)',
                    borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 600
                  }}
                >
                  {addresses.map(addr => (
                    <option key={addr.id} value={addr.id}>
                      {addr.name} — {addr.address}, {addr.city} ({addr.zip})
                    </option>
                  ))}
                  <option value="new">+ Deliver to a New Address</option>
                </select>
              </div>
            )}

            {/* Shipping Form Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: addresses.length > 0 ? '24px' : '0' }}>
              <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Contact Person Name</label>
                <input 
                  type="text" name="name" required
                  placeholder="John Doe" value={formData.name} onChange={handleInputChange}
                  className="form-input" 
                  style={{ padding: '11px' }}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Email Address</label>
                <input 
                  type="email" name="email" required disabled
                  placeholder="john@example.com" value={formData.email} onChange={handleInputChange}
                  className="form-input" 
                  style={{ padding: '11px', opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Street Address</label>
                <input 
                  type="text" name="address" required
                  placeholder="123 Aura Blvd" value={formData.address} onChange={handleInputChange}
                  className="form-input" 
                  style={{ padding: '11px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>City</label>
                <input 
                  type="text" name="city" required
                  placeholder="Chennai" value={formData.city} onChange={handleInputChange}
                  className="form-input" 
                  style={{ padding: '11px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>ZIP / Postal Code</label>
                <input 
                  type="text" name="zip" required
                  placeholder="600001" value={formData.zip} onChange={handleInputChange}
                  className="form-input" 
                  style={{ padding: '11px' }}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Phone Number (for delivery notifications)</label>
                <input 
                  type="text" name="phone" placeholder="+91 98765 43210"
                  value={formData.phone} onChange={handleInputChange}
                  className="form-input" 
                  style={{ padding: '11px' }}
                />
              </div>

              {selectedAddrId === 'new' && (
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <input 
                    type="checkbox" 
                    id="saveToProfile" 
                    checked={saveToProfile}
                    onChange={(e) => setSaveToProfile(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                  />
                  <label htmlFor="saveToProfile" style={{ fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                    Save this address to profile for future orders
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Option Selector (Amazon/Flipkart style) */}
          <div className="glass-panel" style={{ padding: '32px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', fontWeight: 700 }}>
              2. Choose Payment Method
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Cash on Delivery */}
              <div style={{
                border: `2px solid ${paymentSubMethod === 'cod' ? 'var(--secondary)' : 'var(--border-color)'}`,
                background: paymentSubMethod === 'cod' ? 'var(--secondary-glow)' : 'none',
                borderRadius: 'var(--radius-sm)', padding: '16px 20px', transition: 'all var(--transition-fast)'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input 
                    type="radio" name="paymentSubMethod" value="cod"
                    checked={paymentSubMethod === 'cod'} onChange={() => { setPaymentSubMethod('cod'); }}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <div>
                    <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-main)' }}>💵 Cash on Delivery / Direct Order</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Confirm order instantly. Pay in cash/digital upon delivery.</span>
                  </div>
                </label>
                
                {paymentSubMethod === 'cod' && (
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>
                      🛡️ Security Verification Captcha: Enter the 3-digit verification code to confirm COD order:
                    </p>
                    <div className="captcha-container-box">
                      <span className="captcha-number-code">{codCaptchaCode}</span>
                      <button type="button" onClick={refreshCaptcha} className="captcha-refresh-btn" title="Refresh Code">🔄</button>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Enter code" 
                      maxLength={3}
                      value={typedCaptchaCode} 
                      onChange={(e) => setTypedCaptchaCode(e.target.value.replace(/\D/g, ''))}
                      className="form-input"
                      style={{ maxWidth: '180px', padding: '10px', textAlign: 'center', fontSize: '16px', fontWeight: 700, letterSpacing: '3px', alignSelf: 'center' }}
                    />
                  </div>
                )}
              </div>

              {/* UPI Payment Selector */}
              <div style={{
                border: `2px solid ${paymentSubMethod === 'upi' ? 'var(--secondary)' : 'var(--border-color)'}`,
                background: paymentSubMethod === 'upi' ? 'var(--secondary-glow)' : 'none',
                borderRadius: 'var(--radius-sm)', padding: '16px 20px', transition: 'all var(--transition-fast)'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input 
                    type="radio" name="paymentSubMethod" value="upi"
                    checked={paymentSubMethod === 'upi'} 
                    onChange={() => { setPaymentSubMethod('upi'); }}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <div>
                    <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-main)' }}>📲 UPI (Google Pay, PhonePe, Paytm, BHIM)</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pay directly using your secure UPI mobile app PIN authorization.</span>
                  </div>
                </label>
              </div>

              {/* Credit / Debit Card Selector */}
              <div style={{
                border: `2px solid ${paymentSubMethod === 'card' ? 'var(--secondary)' : 'var(--border-color)'}`,
                background: paymentSubMethod === 'card' ? 'var(--secondary-glow)' : 'none',
                borderRadius: 'var(--radius-sm)', padding: '16px 20px', transition: 'all var(--transition-fast)'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input 
                    type="radio" name="paymentSubMethod" value="card"
                    checked={paymentSubMethod === 'card'} onChange={() => { setPaymentSubMethod('card'); }}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <div>
                    <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-main)' }}>💳 Credit / Debit / ATM Cards</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pay securely using Visa, Mastercard, RuPay, or Maestro.</span>
                  </div>
                </label>

                {paymentSubMethod === 'card' && (
                  <div style={{ marginTop: '16px', borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                    
                    {/* Visual credit card preview mockup */}
                    <div className="card-3d-scene">
                      <div className={`interactive-card-mockup ${isCardFlipped ? 'flipped' : ''}`}>
                        {/* Front Side */}
                        <div className="card-face card-face-front">
                          <div className="card-header-line">
                            <div className="card-chip"></div>
                            <span className="card-vendor-logo" style={{ fontSize: '14px' }}>AURA SECURE</span>
                          </div>
                          <div className="card-number-display" style={{ fontSize: '16px', letterSpacing: '2px' }}>
                            {cardData.number || '•••• •••• •••• ••••'}
                          </div>
                          <div className="card-footer-details">
                            <div>
                              <div className="card-label">Card Holder</div>
                              <div className="card-value" style={{ fontSize: '11px' }}>{cardData.name || 'YOUR NAME'}</div>
                            </div>
                            <div>
                              <div className="card-label">Expires</div>
                              <div className="card-value" style={{ fontSize: '11px' }}>{cardData.expiry || 'MM/YY'}</div>
                            </div>
                          </div>
                        </div>
                        {/* Back Side */}
                        <div className="card-face card-face-back">
                          <div className="card-mag-strip"></div>
                          <div className="card-signature-bar">
                            <span className="card-cvv-value">{cardData.cvv || '•••'}</span>
                          </div>
                          <div style={{ padding: '0 20px', fontSize: '9px', color: 'var(--text-muted)', lineHeight: '1.2', textAlign: 'center' }}>
                            Secure card verification system. Authorized signature required. Do not share CVV/OTP.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Input Forms */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px' }}>
                      <div className="form-group" style={{ gridColumn: 'span 3', marginBottom: 0 }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>Card Number</label>
                        <input 
                          type="text" 
                          placeholder="4111 2222 3333 4444" 
                          value={cardData.number}
                          onChange={handleCardNumberChange}
                          onFocus={() => setIsCardFlipped(false)}
                          className="form-input"
                          style={{ padding: '10px' }}
                        />
                      </div>
                      
                      <div className="form-group" style={{ gridColumn: 'span 3', marginBottom: 0 }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>Cardholder Name</label>
                        <input 
                          type="text" 
                          placeholder="John Doe" 
                          value={cardData.name}
                          onChange={handleCardNameChange}
                          onFocus={() => setIsCardFlipped(false)}
                          className="form-input"
                          style={{ padding: '10px' }}
                        />
                      </div>

                      <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>Expiry Date</label>
                        <input 
                          type="text" 
                          placeholder="MM/YY" 
                          value={cardData.expiry}
                          onChange={handleCardExpiryChange}
                          onFocus={() => setIsCardFlipped(false)}
                          className="form-input"
                          style={{ padding: '10px', textAlign: 'center' }}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>CVV</label>
                        <input 
                          type="password" 
                          placeholder="•••" 
                          maxLength={3}
                          value={cardData.cvv}
                          onChange={handleCardCvvChange}
                          onFocus={() => setIsCardFlipped(true)}
                          onBlur={() => setIsCardFlipped(false)}
                          className="form-input"
                          style={{ padding: '10px', textAlign: 'center' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Net Banking Selector */}
              <div style={{
                border: `2px solid ${paymentSubMethod === 'netbank' ? 'var(--secondary)' : 'var(--border-color)'}`,
                background: paymentSubMethod === 'netbank' ? 'var(--secondary-glow)' : 'none',
                borderRadius: 'var(--radius-sm)', padding: '16px 20px', transition: 'all var(--transition-fast)'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input 
                    type="radio" name="paymentSubMethod" value="netbank"
                    checked={paymentSubMethod === 'netbank'} onChange={() => { setPaymentSubMethod('netbank'); }}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <div>
                    <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-main)' }}>🏦 Net Banking</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Log in directly to your bank account to make secure transfer.</span>
                  </div>
                </label>

                {paymentSubMethod === 'netbank' && (
                  <div style={{ marginTop: '16px', borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600 }}>Select Popular Indian Banks:</p>
                    <div className="banking-list-grid">
                      <button 
                        type="button" 
                        onClick={() => setSelectedBank('State Bank of India')}
                        className={`banking-select-button ${selectedBank === 'State Bank of India' ? 'active' : ''}`}
                      >
                        <span className="bank-color-dot" style={{ backgroundColor: '#0083ca' }}></span>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>SBI</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={() => setSelectedBank('HDFC Bank')}
                        className={`banking-select-button ${selectedBank === 'HDFC Bank' ? 'active' : ''}`}
                      >
                        <span className="bank-color-dot" style={{ backgroundColor: '#003366' }}></span>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>HDFC Bank</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={() => setSelectedBank('ICICI Bank')}
                        className={`banking-select-button ${selectedBank === 'ICICI Bank' ? 'active' : ''}`}
                      >
                        <span className="bank-color-dot" style={{ backgroundColor: '#f58220' }}></span>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>ICICI Bank</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={() => setSelectedBank('Axis Bank')}
                        className={`banking-select-button ${selectedBank === 'Axis Bank' ? 'active' : ''}`}
                      >
                        <span className="bank-color-dot" style={{ backgroundColor: '#ae1c4d' }}></span>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>Axis Bank</span>
                      </button>
                    </div>

                    {selectedBank && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
                        You will be redirected to the secure login page of <strong>{selectedBank}</strong>.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Review Panel */}
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
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', fontWeight: 700 }}>Review Order</h3>
            
            {/* Items Summary list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
              {checkoutItems.map(item => (
                <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '10px' }}>
                  {/* Image */}
                  <div style={{ width: '48px', height: '48px', background: 'white', borderRadius: '4px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src={item.image} alt={item.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: item.image_filter || 'none' }} />
                  </div>
                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, color: 'var(--text-main)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>
                      {item.title}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '2px 0 0' }}>Qty: {item.quantity || 1}</p>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)', flexShrink: 0 }}>
                    ₹{(item.price * (item.quantity || 1)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)' }} />

            {/* Cost Summary rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                <span style={{ color: 'var(--text-main)' }}>₹{subtotal.toFixed(2)}</span>
              </div>
              
              {discountRate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                  <span>Promo Discount ({coupon})</span>
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

            {/* Submit Order Button */}
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isAuthorizing}
              style={{ 
                width: '100%', 
                padding: '14px', 
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isAuthorizing ? 0.7 : 1,
                cursor: isAuthorizing ? 'not-allowed' : 'pointer',
                fontWeight: 700
              }}
            >
              {isAuthorizing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '18px', height: '18px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite'
                  }} />
                  <span>Processing...</span>
                </div>
              ) : (
                paymentSubMethod === 'cod' 
                  ? 'Confirm COD Order' 
                  : paymentSubMethod === 'card'
                    ? `Proceed to Card OTP — ₹${total.toFixed(2)}`
                    : paymentSubMethod === 'netbank'
                      ? `Redirect to Net Banking — ₹${total.toFixed(2)}`
                      : `Pay Securely via UPI — ₹${total.toFixed(2)}`
              )}
            </button>
          </div>
        </div>
      </form>

      {/* 💳 CREDIT CARD SECURE OTP MODAL (Visa/Mastercard Style) */}
      {showOtpModal && (
        <div className="secure-otp-modal-overlay">
          <div className="secure-otp-panel">
            <div className="secure-otp-header">
              <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '1px' }}>🛡️ AURA SECURE DEPOSIT</span>
              <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px' }}>OTP Gateway</span>
            </div>
            <div className="secure-otp-body">
              <div>
                <h4 className="secure-otp-title">Enter One-Time Password (OTP)</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#718096' }}>
                  A 6-digit OTP verification code has been sent to your registered phone number.
                </p>
              </div>

              <div style={{ background: '#f7fafc', padding: '12px', borderRadius: '6px', fontSize: '12px', border: '1px solid #e2e8f0', color: '#4a5568' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Merchant:</span><strong>AuraShop Premium</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Amount:</span><strong>₹{total.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Card Number:</span><strong>xxxx xxxx xxxx {cardData.number.slice(-4)}</strong>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <input 
                  type="text" 
                  placeholder="Enter 6-Digit OTP" 
                  maxLength={6}
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                  className="secure-otp-input-code"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setOtpValue(targetOtp)}
                  className="secure-otp-cancel-btn"
                  style={{ flex: 1 }}
                >
                  Auto Fill OTP
                </button>
                <button 
                  type="button" 
                  onClick={async () => {
                    if (otpValue !== targetOtp) {
                      addToast('Error: Invalid OTP code entered. Click "Auto Fill OTP" to test.', 'error')
                      return
                    }
                    setIsAuthorizing(true)
                    await new Promise(resolve => setTimeout(resolve, 1500))
                    submitDirectOrder('card', `Card (Ending: ${cardData.number.slice(-4)})`)
                  }}
                  disabled={isAuthorizing || otpValue.length !== 6}
                  className="secure-otp-submit-btn"
                  style={{ flex: 1 }}
                >
                  {isAuthorizing ? 'Verifying...' : 'Submit OTP'}
                </button>
              </div>

              <button 
                type="button" 
                onClick={() => { setShowOtpModal(false); setOtpValue(''); }}
                className="secure-otp-cancel-btn"
              >
                Cancel Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📲 UPI SECURE PIN MODAL (AUTHENTIC NPCI STYLE) */}
      {showUpiPinModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 7, 12, 0.98)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          fontFamily: 'var(--font-heading)'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '380px', width: '100%', padding: '0', borderRadius: '12px',
            background: '#1c2434', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: 'var(--shadow-glow), 0 20px 40px rgba(0,0,0,0.6)'
          }}>
            {/* NPCI Header */}
            <div style={{
              background: '#0a0f1d', padding: '16px 20px', display: 'flex', 
              justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div>
                <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, display: 'block', letterSpacing: '1px' }}>SECURE UPI GATEWAY</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'white' }}>NPCI AUTHENTICATION</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 950, color: '#ffea00', fontStyle: 'italic', letterSpacing: '0.5px' }}>BHIM | UPI</div>
            </div>

            {/* Merchant / Recipient Details Block */}
            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Recipient</p>
                  <h5 style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 700, color: 'white' }}>Praveen ({upiId})</h5>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Amount</p>
                  <h5 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 800, color: '#10b981' }}>₹{total.toFixed(2)}</h5>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>Merchant:</span>
                <span style={{ color: 'white', fontWeight: 600 }}>AuraShop Premium</span>
              </div>
            </div>

            {/* PIN Dots Area */}
            <div style={{ padding: '30px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>ENTER 6-DIGIT UPI PIN</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#f59e0b' }}>⚠️ Never share your UPI PIN with anyone.</p>
              </div>

              {/* Pin Dots */}
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', margin: '10px 0' }}>
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const hasVal = upiPinValue.length > index
                  return (
                    <div 
                      key={index}
                      style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        border: `2px solid ${hasVal ? '#10b981' : 'rgba(255,255,255,0.2)'}`,
                        background: hasVal ? '#10b981' : 'transparent',
                        boxShadow: hasVal ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    />
                  )
                })}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Demo PIN is 999999)</span>
            </div>

            {/* Secure Numeric Keypad */}
            <div style={{
              background: '#0a0f1d', padding: '15px', display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.05)'
            }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num} type="button"
                  onClick={() => {
                    if (upiPinValue.length < 6) {
                      setUpiPinValue(prev => prev + num)
                    }
                  }}
                  style={{
                    padding: '16px', fontSize: '20px', fontWeight: 700, color: 'white',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px', cursor: 'pointer', transition: 'background 0.1s'
                  }}
                >
                  {num}
                </button>
              ))}
              
              {/* Backspace Button */}
              <button
                type="button"
                onClick={() => setUpiPinValue(prev => prev.slice(0, -1))}
                style={{
                  padding: '16px', fontSize: '16px', fontWeight: 700, color: '#ef4444',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '8px', cursor: 'pointer'
                }}
              >
                ⌫
              </button>

              {/* Zero Button */}
              <button
                type="button"
                onClick={() => {
                  if (upiPinValue.length < 6) {
                    setUpiPinValue(prev => prev + '0')
                  }
                }}
                style={{
                  padding: '16px', fontSize: '20px', fontWeight: 700, color: 'white',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '8px', cursor: 'pointer'
                }}
              >
                0
              </button>

              {/* Submit Button */}
              <button
                type="button"
                onClick={async () => {
                  if (upiPinValue !== '999999' && upiPinValue !== '123456') {
                    addToast('Error: Incorrect UPI PIN. Please enter the correct PIN (999999).', 'error')
                    setUpiPinValue('')
                    return
                  }
                  setIsAuthorizing(true)
                  await new Promise(resolve => setTimeout(resolve, 1500))
                  submitDirectOrder('upi', `UPI (Praveen - ${upiId})`)
                }}
                disabled={isAuthorizing || upiPinValue.length !== 6}
                style={{
                  padding: '16px', fontSize: '18px', fontWeight: 700, color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '8px', cursor: 'pointer', opacity: upiPinValue.length === 6 ? 1 : 0.5
                }}
              >
                ✓
              </button>
            </div>
            
            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => { setShowUpiPinModal(false); setUpiPinValue(''); }}
              style={{
                width: '100%', padding: '12px', background: '#0a0f1d', border: 'none',
                color: '#cbd5e0', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                borderTop: '1px solid rgba(255,255,255,0.05)'
              }}
              disabled={isAuthorizing}
            >
              Cancel Transaction
            </button>
          </div>
        </div>
      )}



      {/* 🏦 NET BANKING PORTAL CONFIRMATION MODAL */}
      {showNetBankModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 7, 12, 0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1900
        }}>
          <div className="glass-panel" style={{
            maxWidth: '460px', width: '100%', padding: '32px', borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', margin: 0 }}>
              🏦 {selectedBank} Net Banking
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                You are logged in to the secure gateway interface of <strong>{selectedBank}</strong>.
              </p>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Merchant:</span><strong>AuraShop Premium</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Transaction Amount:</span><strong>₹{total.toFixed(2)}</strong>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Net Banking User ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. sbi_user_992" 
                  className="form-input" 
                  style={{ padding: '10px' }} 
                  value={netBankUserId} 
                  onChange={(e) => setNetBankUserId(e.target.value)} 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="form-input" 
                  style={{ padding: '10px' }} 
                  value={netBankPassword} 
                  onChange={(e) => setNetBankPassword(e.target.value)} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button 
                type="button" 
                onClick={() => { setShowNetBankModal(false); setSelectedBank(''); }}
                className="btn-secondary" 
                style={{ flex: 1, padding: '12px' }}
                disabled={isAuthorizing}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={async () => {
                  if (!netBankUserId.trim()) {
                    addToast('Error: Net Banking User ID is compulsory. Please fill out this field.', 'error')
                    return
                  }
                  if (netBankUserId.trim().length < 5) {
                    addToast('Error: Invalid User ID. Must be at least 5 characters.', 'error')
                    return
                  }
                  if (!netBankPassword) {
                    addToast('Error: Net Banking Password is compulsory. Please fill out this field.', 'error')
                    return
                  }
                  if (netBankPassword.length < 6) {
                    addToast('Error: Invalid Password. Must be at least 6 characters.', 'error')
                    return
                  }
                  setIsAuthorizing(true)
                  await new Promise(resolve => setTimeout(resolve, 1500))
                  submitDirectOrder('netbank', `Net Banking (${selectedBank})`)
                }}
                className="btn-primary" 
                style={{ flex: 1, padding: '12px' }}
                disabled={isAuthorizing}
              >
                {isAuthorizing ? 'Authorizing...' : 'Authorize Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded spinner styles */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default Checkout
