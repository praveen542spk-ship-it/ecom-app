import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCart } from '../services/CartContext'
import { useToast } from '../components/Toast'
import { API_URL } from '../services/AuthContext'

function CheckoutSuccess() {
  const [searchParams] = useSearchParams()
  const { cart, dispatch } = useCart()
  const { addToast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [products, setProducts] = useState([])

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error('Error fetching catalog products for fallback:', err))
  }, [])

  const getItemImage = (item) => {
    if (item.image) return item.image
    const found = products.find(p => p.title === item.title || item.title.startsWith(p.title))
    return found ? found.image : ''
  }
  
  // Use a ref to prevent double processing in React StrictMode
  const verifiedRef = useRef(false)

  const sessionId = searchParams.get('session_id')
  const userId = searchParams.get('userId')
  const mock = searchParams.get('mock')

  useEffect(() => {
    if (!sessionId || verifiedRef.current) return
    verifiedRef.current = true

    // Get shipping address from local storage
    const savedAddressStr = localStorage.getItem('checkout_shipping_address')
    const shippingAddress = savedAddressStr ? JSON.parse(savedAddressStr) : null

    // Get checkout items and is_buy_now flag from local storage
    const savedCheckoutItemsStr = localStorage.getItem('checkout_items')
    const checkoutItems = savedCheckoutItemsStr ? JSON.parse(savedCheckoutItemsStr) : cart
    const isBuyNow = localStorage.getItem('is_buy_now') === 'true'

    // Call API to verify payment and write order to db
    fetch(`${API_URL}/api/payment/verify-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        userId,
        mock,
        cartItems: checkoutItems, // Fallback items for mock payments creation
        shippingAddress
      })
    })
      .then(res => {
        if (res.ok) return res.json()
        throw new Error('Payment verification failed.')
      })
      .then(data => {
        setOrder(data.order)
        setLoading(false)

        // Clear global cart only if is_buy_now is false
        if (!isBuyNow) {
          dispatch({ type: 'CLEAR_CART' })
        } else {
          // If it was a buy now checkout, clean up buy_now_item just in case
          localStorage.removeItem('buy_now_item')
        }

        // Clean up checkout-specific localStorage items after verification
        localStorage.removeItem('checkout_shipping_address')
        localStorage.removeItem('checkout_items')
        localStorage.removeItem('is_buy_now')

        addToast('Payment verified successfully!', 'success')
      })
      .catch(err => {
        console.error(err)
        setError(err.message || 'Verification failed.')
        setLoading(false)
      })
  }, [sessionId, userId, mock, dispatch, addToast, cart])

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px', height: '50px',
            border: '4px solid var(--border-color)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <h2 style={{ fontSize: '20px', color: 'var(--text-muted)' }}>Confirming transaction with Stripe...</h2>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
        <div className="glass-panel" style={{ padding: '40px', borderRadius: 'var(--radius-lg)', textAlign: 'center', maxWidth: '460px' }}>
          <span style={{ fontSize: '50px' }}>❌</span>
          <h2 style={{ fontSize: '24px', margin: '16px 0 8px', color: 'var(--accent)' }}>Verification Failed</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>
            We encountered a problem confirming your transaction. If money was deducted, please contact support with your Session ID.
          </p>
          <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '4px', fontSize: '11px', marginBottom: '24px', wordBreak: 'break-all' }}>
            Session ID: {sessionId}
          </div>
          <Link to="/" className="btn-primary" style={{ display: 'block' }}>Return to Shop</Link>
        </div>
      </div>
    )
  }

  const isUpi = order?.paymentMethod === 'upi' || sessionId?.startsWith('upi_')
  const isCod = order?.paymentMethod === 'cod' || sessionId?.startsWith('cod_')

  let successTitle = 'Payment Confirmed!'
  let successDescription = 'Thank you for shopping with AuraShop! Your transaction has been approved by Stripe. A receipt has been saved to your account.'
  let amountLabel = 'Paid Amount'

  if (isUpi) {
    successTitle = 'Order Submitted!'
    successDescription = `Thank you for shopping with AuraShop! We have received your UPI payment details (UTR: ${order?.upiTransactionId || 'Pending'}). Your order will be processed as soon as we verify the transaction with our bank.`
    amountLabel = 'Total Amount (via UPI)'
  } else if (isCod) {
    successTitle = 'Order Placed!'
    successDescription = 'Thank you for shopping with AuraShop! Your cash-on-delivery order has been received and is currently being processed.'
    amountLabel = 'Total Amount (Pay on Delivery)'
  }

  return (
    <>
      <div className="checkout-success-screen-area app-container animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '75vh' }}>
        <div 
          className="glass-panel" 
          style={{
            maxWidth: '520px',
            width: '100%',
            padding: '48px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-card)',
            textAlign: 'center',
            boxShadow: 'var(--shadow-glow), var(--shadow-lg)'
          }}
        >
          <span style={{ fontSize: '72px', display: 'block', marginBottom: '24px', animation: 'float 3s ease-in-out infinite' }}>🎉</span>
          <h2 style={{ fontSize: '32px', marginBottom: '12px' }}>{successTitle}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
            {successDescription}
          </p>

          <div style={{
            background: 'var(--bg-input)',
            border: '1px dashed var(--border-color)',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '32px',
            fontSize: '14px'
          }}>
            <p style={{ color: 'var(--text-muted)' }}>Receipt Reference</p>
            <p style={{ fontWeight: 700, fontSize: '18px', color: 'var(--primary)', marginTop: '4px' }}>{order?.id}</p>

            {/* Purchased Items List */}
            {order?.items && order.items.length > 0 && (
              <div style={{ marginTop: '16px', borderTop: '1px dashed var(--border-color)', paddingTop: '16px', textAlign: 'left' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Items Purchased</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {order.items.map((item, idx) => {
                    const imgUrl = getItemImage(item);
                    return (
                      <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
                        {imgUrl && (
                          <div style={{ width: '36px', height: '36px', background: 'white', borderRadius: '4px', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <img src={imgUrl} alt={item.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: item.image_filter || 'none' }} />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: 'var(--text-main)', fontWeight: 500, margin: 0, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.title}
                          </p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '2px 0 0' }}>Qty: {item.quantity}</p>
                        </div>
                        <span style={{ color: 'var(--text-main)', fontWeight: 600, flexShrink: '0' }}>
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginTop: '16px', borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
              {amountLabel}: ₹{order?.amount?.toFixed(2)}
            </p>
            {isUpi && order?.upiTransactionId && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                UTR: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--secondary)' }}>{order?.upiTransactionId}</span>
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Link 
              to="/dashboard" 
              className="btn-secondary" 
              style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '42px', fontSize: '13px', fontWeight: 600 }}
            >
              Go to Dashboard
            </Link>
            <button 
              onClick={() => window.print()} 
              className="btn-primary" 
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '42px', fontSize: '13px', fontWeight: 700 }}
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              Print Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Hidden print area for invoice print */}
      {order && (
        <div className="invoice-print-area invoice-print-only" style={{ display: 'none', flexDirection: 'column', gap: '30px', color: '#000000', padding: '40px', background: '#ffffff' }}>
          {/* Brand Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000000', paddingBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: '#000000' }}>AuraShop</h1>
              <p style={{ fontSize: '12px', color: '#666666', marginTop: '4px' }}>The Premium E-Commerce Experience</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', margin: 0, color: '#000000' }}>Tax Invoice</h2>
              <p style={{ fontSize: '12px', color: '#666666', marginTop: '4px' }}>Invoice No: AUR-INV-{order.id.split('-')[2] || '9874'}</p>
              <p style={{ fontSize: '12px', color: '#666666' }}>Date: {order.date}</p>
            </div>
          </div>

          {/* Addresses Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', fontSize: '13px' }}>
            <div>
              <h4 style={{ color: '#000000', marginBottom: '8px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Seller Details</h4>
              <strong>AuraShop India Private Ltd.</strong>
              <p style={{ color: '#666666', lineHeight: 1.4, margin: '4px 0 0' }}>
                Plot 12, Tech Boulevard, Sector 4<br />
                IT Park Hub, Bengaluru, Karnataka - 560001<br />
                GSTIN: 29AABCA1234F1Z0<br />
                Email: support@aurashop.in
              </p>
            </div>
            <div>
              <h4 style={{ color: '#000000', marginBottom: '8px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Buyer Details (Bill To)</h4>
              {order.shippingAddress ? (
                <>
                  <strong>{order.shippingAddress.name}</strong>
                  <p style={{ color: '#666666', lineHeight: 1.4, margin: '4px 0 0' }}>
                    {order.shippingAddress.address}<br />
                    {order.shippingAddress.city} - {order.shippingAddress.zip}<br />
                    Phone: {order.shippingAddress.phone || 'N/A'}
                  </p>
                </>
              ) : (
                <p style={{ color: '#666666', fontStyle: 'italic' }}>No shipping address provided.</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000000' }}>
                <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: 700 }}>Product Description</th>
                <th style={{ textAlign: 'center', padding: '10px 0', width: '80px', fontWeight: 700 }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '10px 0', width: '120px', fontWeight: 700 }}>Unit Price</th>
                <th style={{ textAlign: 'right', padding: '10px 0', width: '120px', fontWeight: 700 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eeeeee' }}>
                  <td style={{ padding: '12px 0', fontWeight: 500, color: '#000000' }}>{item.title}</td>
                  <td style={{ textAlign: 'center', padding: '12px 0', color: '#666666' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '12px 0', color: '#666666' }}>₹{item.price.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '12px 0', fontWeight: 600, color: '#000000' }}>₹{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary and QR */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px', borderTop: '2px solid #000000', paddingTop: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <svg width="70" height="70" viewBox="0 0 100 100" style={{ background: '#ffffff', padding: '6px', borderRadius: '4px', border: '1px solid #dddddd' }}>
                <path d="M5,5 h30 v30 h-30 z M15,15 h10 v10 h-10 z M65,5 h30 v30 h-30 z M75,15 h10 v10 h-10 z M5,65 h30 v30 h-30 z M15,75 h10 v10 h-10 z" fill="#000000" />
                <path d="M45,15 h10 v10 h-10 z M45,35 h10 v15 h-10 z M55,5 h10 v10 h-10 z M65,45 h15 v10 h-15 z M5,45 h10 v10 h-10 z M25,45 h10 v10 h-10 z M35,55 h10 v15 h-10 z M45,75 h15 v10 h-15 z M65,65 h10 v10 h-10 z M85,65 h10 v10 h-10 z M75,85 h10 v10 h-10 z" fill="#000000" />
              </svg>
              <div style={{ fontSize: '11px', color: '#666666', lineHeight: 1.4 }}>
                <strong>Verify Invoice</strong><br />
                Scan this secure code to verify payment status, product authenticity, and receipt warranty.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666666' }}>Subtotal:</span>
                <span style={{ color: '#000000' }}>₹{(order.amount / 1.08).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666666' }}>Tax (8%):</span>
                <span style={{ color: '#000000' }}>₹{(order.amount - (order.amount / 1.08)).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000000', paddingTop: '10px', fontSize: '16px', fontWeight: 700 }}>
                <span style={{ color: '#000000' }}>
                  {(order.paymentMethod === 'cod') ? 'Amount to Pay (COD):' : 'Amount Paid:'}
                </span>
                <span style={{ color: '#000000' }}>
                  ₹{order.amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #eeeeee', paddingTop: '16px', textAlign: 'center', fontSize: '11px', color: '#999999' }}>
            This is a computer-generated document and does not require a signature. Thank you for your business!
          </div>
        </div>
      )}
    </>
  )
}

export default CheckoutSuccess
