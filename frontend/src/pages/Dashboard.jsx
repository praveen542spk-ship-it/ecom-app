import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, API_URL } from '../services/AuthContext'
import { useCart } from '../services/CartContext'
import { useToast } from '../components/Toast'
// Estimated delivery date calculator helper
const calculateEstDelivery = (orderDateStr) => {
  try {
    const parts = orderDateStr.split('/')
    let date
    if (parts.length === 3) {
      date = new Date(orderDateStr)
      if (isNaN(date.getTime())) {
        date = new Date(parts[2], parts[1] - 1, parts[0])
      }
    } else {
      date = new Date(orderDateStr)
    }
    
    if (isNaN(date.getTime())) {
      return '3 Days from Order'
    }
    
    date.setDate(date.getDate() + 3)
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '3 Days from Order'
  }
}

// Live Countdown Tracker Component
function CountdownTracker({ orderId, orderStatus }) {
  const [timeLeft, setTimeLeft] = useState(orderStatus === 'Delivered' ? 'Completed' : '')

  useEffect(() => {
    if (orderStatus === 'Delivered') return

    // Seed countdown time from orderId digits to make it stable on refreshes
    const numId = parseInt(orderId.replace(/\D/g, ''), 10) || 50000
    const seedTime = (numId % 43200) + 14400 // between 4 and 16 hours in seconds

    let secondsLeft = seedTime - Math.floor((Date.now() % 3600000) / 1000)
    if (secondsLeft < 0) secondsLeft = 3600 + (secondsLeft % 3600)

    const updateTimer = () => {
      if (secondsLeft <= 0) {
        setTimeLeft('Arriving shortly')
        return
      }
      const h = Math.floor(secondsLeft / 3600)
      const m = Math.floor((secondsLeft % 3600) / 60)
      const s = secondsLeft % 60
      setTimeLeft(`${h}h ${m}m ${s}s`)
      secondsLeft--
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [orderId, orderStatus])

  if (orderStatus === 'Delivered') {
    return <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Package Delivered!</span>
  }

  return (
    <span style={{ color: 'var(--primary)', fontWeight: 700, fontFamily: 'monospace' }}>
      {timeLeft}
    </span>
  )
}

function Dashboard() {
  const { user, token, logout, getAuthHeaders } = useAuth()
  const { dispatch } = useCart()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null)
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [addresses, setAddresses] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const getItemImage = (item) => {
    if (item.image) return item.image
    const found = products.find(p => p.title === item.title || item.title.startsWith(p.title))
    return found ? found.image : ''
  }

  // Address form state
  const [newAddr, setNewAddr] = useState({ name: '', address: '', city: '', zip: '', phone: '' })
  const [addingAddr, setAddingAddr] = useState(false)

  // Admin Portal Product Form state
  const [adminProduct, setAdminProduct] = useState({
    title: '',
    price: '',
    description: '',
    category: 'electronics',
    customCategory: '',
    image: '',
    stock: '10'
  })
  const [submittingAdmin, setSubmittingAdmin] = useState(false)

  // 10+5 Backoffice Admin States
  const [adminActiveSubTab, setAdminActiveSubTab] = useState('stats')
  const [adminStats, setAdminStats] = useState(null)
  const [adminOrders, setAdminOrders] = useState([])
  const [adminCoupons, setAdminCoupons] = useState([])
  const [adminUsers, setAdminUsers] = useState([])
  const [adminReviews, setAdminReviews] = useState([])
  const [editingProduct, setEditingProduct] = useState(null) // Feature 14: Quick Edit Modal
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState('')
  const [orderSearchText, setOrderSearchText] = useState('')
  const [productSearchText, setProductSearchText] = useState('')
  const [customerSearchText, setCustomerSearchText] = useState('') // Feature 13: Search customers
  const [showAddForm, setShowAddForm] = useState(false) // Toggle add product form

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate('/login')
    }
  }, [token, navigate])

  // Fetch Orders, Wishlist, and Addresses
  useEffect(() => {
    if (!token) return

    const headers = getAuthHeaders()

    // Fetch orders
    const fetchOrders = fetch(`${API_URL}/api/orders`, { headers })
      .then(res => res.json())
      .then(data => setOrders(data))
      .catch(err => console.error('Error fetching orders:', err))

    // Fetch wishlist
    const fetchWishlist = fetch(`${API_URL}/api/wishlist`, { headers })
      .then(res => res.json())
      .then(data => setWishlist(data))
      .catch(err => console.error('Error fetching wishlist:', err))

    // Fetch addresses
    const fetchAddresses = fetch(`${API_URL}/api/addresses`, { headers })
      .then(res => res.json())
      .then(data => setAddresses(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching addresses:', err))

    // Fetch catalog products for images fallback
    const fetchProducts = fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error('Error fetching products:', err))

    Promise.all([fetchOrders, fetchWishlist, fetchAddresses, fetchProducts]).finally(() => setLoading(false))
  }, [token, getAuthHeaders])



  const handleLogout = () => {
    logout()
    addToast('Logged out successfully.', 'info')
    navigate('/')
  }

  const handleToggleWishlist = async (productId) => {
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
      
      setWishlist(prev => prev.filter(p => p.id !== productId))
      addToast('Removed from wishlist.', 'info')
    } catch {
      addToast('Failed to modify wishlist.', 'error')
    }
  }

  const handleAddToCart = (product) => {
    dispatch({ type: 'ADD_ITEM', payload: product })
    addToast(`${product.title.substring(0, 20)}... added to cart!`, 'success')
  }

  const handleAddAddress = async (e) => {
    e.preventDefault()
    if (!newAddr.name || !newAddr.address || !newAddr.city || !newAddr.zip) {
      addToast('Please fill out all required fields.', 'error')
      return
    }

    setAddingAddr(true)
    try {
      const res = await fetch(`${API_URL}/api/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(newAddr)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save address')

      setAddresses(prev => [...prev, data])
      setNewAddr({ name: '', address: '', city: '', zip: '', phone: '' })
      addToast('Address added successfully!', 'success')
    } catch (err) {
      addToast(err.message || 'Error saving address.', 'error')
    } finally {
      setAddingAddr(false)
    }
  }

  const handleDeleteAddress = async (addrId) => {
    try {
      const res = await fetch(`${API_URL}/api/addresses/${addrId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (!res.ok) throw new Error()

      setAddresses(prev => prev.filter(a => a.id !== addrId))
      addToast('Address deleted.', 'info')
    } catch {
      addToast('Failed to delete address.', 'error')
    }
  }

  const fetchAdminStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAdminStats(data)
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }, [getAuthHeaders])

  const fetchAdminOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/orders`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAdminOrders(data)
    } catch (err) {
      console.error('Error fetching orders:', err)
    }
  }, [getAuthHeaders])

  const fetchAdminCoupons = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/coupons`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAdminCoupons(data)
    } catch (err) {
      console.error('Error fetching coupons:', err)
    }
  }, [getAuthHeaders])

  const fetchAdminUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAdminUsers(data)
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }, [getAuthHeaders])

  const fetchAdminReviews = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/reviews`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAdminReviews(data)
    } catch (err) {
      console.error('Error fetching reviews:', err)
    }
  }, [getAuthHeaders])

  // Admin Portal Fetches Effect
  useEffect(() => {
    if (!token || user?.email !== 'praveen542spk@gmail.com') return

    /* eslint-disable react-hooks/set-state-in-effect */
    fetchAdminStats()
    fetchAdminOrders()
    fetchAdminCoupons()
    fetchAdminUsers()
    fetchAdminReviews()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [token, user, fetchAdminStats, fetchAdminOrders, fetchAdminCoupons, fetchAdminUsers, fetchAdminReviews])

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error()
      addToast(`Order ${orderId} status updated to ${newStatus}.`, 'success')
      fetchAdminOrders()
      fetchAdminStats()
    } catch {
      addToast('Failed to update order status.', 'error')
    }
  }

  const handleUpdateProduct = async (e) => {
    e.preventDefault()
    if (!editingProduct.title || !editingProduct.price || !editingProduct.description || !editingProduct.image) {
      addToast('Please fill out all required fields.', 'error')
      return
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          title: editingProduct.title,
          price: Number(editingProduct.price),
          description: editingProduct.description,
          category: editingProduct.category,
          image: editingProduct.image,
          stock: Number(editingProduct.stock)
        })
      })

      if (!res.ok) throw new Error()
      addToast('Product updated successfully!', 'success')
      setEditingProduct(null)
      // Refresh list
      const fetchRes = await fetch(`${API_URL}/api/products`)
      const fetchedProducts = await fetchRes.json()
      setProducts(fetchedProducts)
      fetchAdminStats()
    } catch {
      addToast('Failed to update product.', 'error')
    }
  }

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product from the catalog?')) return
    try {
      const res = await fetch(`${API_URL}/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (!res.ok) throw new Error()
      addToast('Product deleted.', 'success')
      const fetchRes = await fetch(`${API_URL}/api/products`)
      const fetchedProducts = await fetchRes.json()
      setProducts(fetchedProducts)
      fetchAdminStats()
    } catch {
      addToast('Failed to delete product.', 'error')
    }
  }

  const handleQuickRestock = async (product, amount = 10) => {
    try {
      const currentStock = product.stock !== undefined ? product.stock : 0;
      const res = await fetch(`${API_URL}/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          title: product.title,
          price: product.price,
          description: product.description,
          category: product.category,
          image: product.image,
          stock: currentStock + amount
        })
      })
      if (!res.ok) throw new Error()
      addToast(`Restocked 10 units for ${product.title}!`, 'success')
      const fetchRes = await fetch(`${API_URL}/api/products`)
      const fetchedProducts = await fetchRes.json()
      setProducts(fetchedProducts)
      fetchAdminStats()
    } catch {
      addToast('Failed to restock product.', 'error')
    }
  }

  const handleAddCoupon = async (e) => {
    e.preventDefault()
    if (!couponCode || !couponDiscount) {
      addToast('Coupon code and discount rate are required.', 'error')
      return
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          code: couponCode,
          discountRate: Number(couponDiscount) / 100
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add coupon')

      addToast(`Promo code "${couponCode.toUpperCase()}" added successfully!`, 'success')
      setCouponCode('')
      setCouponDiscount('')
      fetchAdminCoupons()
      fetchAdminStats()
    } catch (err) {
      addToast(err.message || 'Failed to add coupon.', 'error')
    }
  }

  const handleDeleteCoupon = async (code) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/coupons/${code}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (!res.ok) throw new Error()
      addToast('Coupon deleted.', 'info')
      fetchAdminCoupons()
      fetchAdminStats()
    } catch {
      addToast('Failed to delete coupon.', 'error')
    }
  }

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this customer review?')) return
    try {
      const res = await fetch(`${API_URL}/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (!res.ok) throw new Error()
      addToast('Customer review deleted.', 'info')
      fetchAdminReviews()
      fetchAdminStats()
    } catch {
      addToast('Failed to delete review.', 'error')
    }
  }

  const handleUpdateConfig = async (updatedConfig) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(updatedConfig)
      })
      if (!res.ok) throw new Error()
      addToast('Store settings updated!', 'success')
      fetchAdminStats()
    } catch {
      addToast('Failed to update config settings.', 'error')
    }
  }

  const handleDownloadBackup = () => {
    const backupData = {
      products,
      orders: adminOrders,
      users: adminUsers,
      coupons: adminCoupons,
      reviews: adminReviews,
      logs: adminStats?.recentLogs || [],
      config: adminStats?.config || {}
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `aurashop_db_backup_${Date.now()}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    addToast('Database backup downloaded successfully!', 'success')
  }

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8," + "Order ID,Date,Amount,Payment Method,Status,Customer Name,Phone,Address,City,Zip,Items\n"
    adminOrders.forEach(o => {
      const itemsStr = o.items.map(i => `${i.title} (x${i.quantity})`).join('; ')
      const addr = o.shippingAddress || {}
      const row = [
        o.id,
        o.date,
        o.amount,
        o.paymentMethod || 'Stripe',
        o.status,
        addr.name || 'N/A',
        addr.phone || 'N/A',
        `"${(addr.address || '').replace(/"/g, '""')}"`,
        addr.city || 'N/A',
        addr.zip || 'N/A',
        `"${itemsStr.replace(/"/g, '""')}"`
      ].join(",")
      csvContent += row + "\n"
    })
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `aurashop_sales_report_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    addToast('Sales report CSV exported!', 'success')
  }

  const handleAddProduct = async (e) => {
    e.preventDefault()
    if (!adminProduct.title || !adminProduct.price || !adminProduct.description || !adminProduct.image) {
      addToast('Please fill out all required fields.', 'error')
      return
    }

    setSubmittingAdmin(true)
    try {
      const payload = {
        title: adminProduct.title,
        price: Number(adminProduct.price),
        description: adminProduct.description,
        category: adminProduct.category === 'custom' ? adminProduct.customCategory : adminProduct.category,
        image: adminProduct.image,
        stock: Number(adminProduct.stock) || 10
      }

      if (!payload.category) {
        addToast('Please select or specify a category.', 'error')
        setSubmittingAdmin(false)
        return
      }

      const res = await fetch(`${API_URL}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add product')

      addToast('Product added successfully!', 'success')
      setAdminProduct({
        title: '',
        price: '',
        description: '',
        category: 'electronics',
        customCategory: '',
        image: '',
        stock: '10'
      })

      const fetchRes = await fetch(`${API_URL}/api/products`)
      const fetchedProducts = await fetchRes.json()
      setProducts(fetchedProducts)
      fetchAdminStats()

    } catch (err) {
      addToast(err.message || 'Error adding product.', 'error')
    } finally {
      setSubmittingAdmin(false)
    }
  }

  const renderStatusStep = (currentStatus, targetStatus) => {
    const statuses = ['Processing', 'Shipped', 'Delivered']
    const currentIndex = statuses.indexOf(currentStatus)
    const targetIndex = statuses.indexOf(targetStatus)
    const isActive = currentIndex >= targetIndex

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
        <div style={{
          width: '24px', height: '24px',
          borderRadius: '50%',
          background: isActive ? 'var(--primary)' : 'var(--bg-input)',
          border: `2px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
          color: isActive ? 'white' : 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, zIndex: 2
        }}>
          {isActive ? '✓' : ''}
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: isActive ? 'var(--text-main)' : 'var(--text-muted)', marginTop: '8px' }}>
          {targetStatus}
        </span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <h2 style={{ fontSize: '20px', color: 'var(--text-muted)' }}>Loading Account Portal...</h2>
      </div>
    )
  }

  return (
    <div className="app-container animate-fade-in">
      {/* Account Info Header Banner */}
      <div className="glass-panel" style={{
        padding: '32px',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.02) 100%)',
        marginBottom: '40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '64px', height: '64px',
            borderRadius: '50%',
            background: 'var(--primary-glow)',
            color: 'var(--primary)',
            fontSize: '28px',
            fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '24px', margin: 0 }}>{user?.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>{user?.email}</p>
          </div>
        </div>

        <button onClick={handleLogout} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '14px' }}>
          Sign Out
        </button>
      </div>

      {/* Tabs Switcher Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '32px',
        gap: '24px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            background: 'none', border: 'none',
            fontSize: '16px', fontWeight: 600,
            color: activeTab === 'orders' ? 'var(--primary)' : 'var(--text-muted)',
            padding: '12px 4px', cursor: 'pointer',
            borderBottom: activeTab === 'orders' ? '2px solid var(--primary)' : '2px solid transparent',
            transition: 'all var(--transition-fast)'
          }}
        >
          Order History ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('wishlist')}
          style={{
            background: 'none', border: 'none',
            fontSize: '16px', fontWeight: 600,
            color: activeTab === 'wishlist' ? 'var(--primary)' : 'var(--text-muted)',
            padding: '12px 4px', cursor: 'pointer',
            borderBottom: activeTab === 'wishlist' ? '2px solid var(--primary)' : '2px solid transparent',
            transition: 'all var(--transition-fast)'
          }}
        >
          My Wishlist ({wishlist.length})
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          style={{
            background: 'none', border: 'none',
            fontSize: '16px', fontWeight: 600,
            color: activeTab === 'addresses' ? 'var(--primary)' : 'var(--text-muted)',
            padding: '12px 4px', cursor: 'pointer',
            borderBottom: activeTab === 'addresses' ? '2px solid var(--primary)' : '2px solid transparent',
            transition: 'all var(--transition-fast)'
          }}
        >
          Saved Addresses ({addresses.length})
        </button>
        {user?.email === 'praveen542spk@gmail.com' && (
          <button
            onClick={() => setActiveTab('admin')}
            style={{
              background: 'none', border: 'none',
              fontSize: '16px', fontWeight: 600,
              color: activeTab === 'admin' ? 'var(--primary)' : 'var(--text-muted)',
              padding: '12px 4px', cursor: 'pointer',
              borderBottom: activeTab === 'admin' ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'all var(--transition-fast)'
            }}
          >
            Admin Portal (Add Product)
          </button>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === 'orders' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <span style={{ fontSize: '48px' }}>📦</span>
              <h3 style={{ fontSize: '18px', marginTop: '16px' }}>No orders placed yet</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Browse the store and buy items to see them here.</p>
              <Link to="/products" className="btn-primary" style={{ marginTop: '16px', display: 'inline-block' }}>
                Start Shopping
              </Link>
            </div>
          ) : (
            orders.map(order => (
              <div 
                key={order.id}
                className="glass-panel"
                style={{
                  padding: '24px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}
              >
                {/* Order Top Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Order ID</span>
                    <h4 style={{ fontSize: '16px', color: 'var(--text-main)', marginTop: '2px' }}>{order.id}</h4>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date Placed</span>
                    <p style={{ fontSize: '14px', color: 'var(--text-main)', marginTop: '2px', fontWeight: 500 }}>{order.date}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Amount</span>
                    <p style={{ fontSize: '16px', color: 'var(--primary)', marginTop: '2px', fontWeight: 700 }}>₹{order.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status</span>
                    <p style={{
                      fontSize: '12px', fontWeight: 700, padding: '4px 8px', borderRadius: '12px', marginTop: '2px', alignSelf: 'flex-start',
                      background: order.status === 'Delivered' ? '#d1fae5' : '#fee2e2',
                      color: order.status === 'Delivered' ? '#065f46' : '#991b1b'
                    }}>
                      {order.status}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Actions</span>
                    <button 
                      onClick={() => setSelectedInvoiceOrder(order)}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '11px', height: '28px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                    >
                      <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                      Invoice
                    </button>
                  </div>
                </div>

                {/* Items and Status Bar Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', flexWrap: 'wrap' }}>
                  {/* Items List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {order.items.map((item, idx) => {
                      const imgUrl = getItemImage(item);
                      return (
                        <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                          {imgUrl && (
                            <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '4px', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <img src={imgUrl} alt={item.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: item.image_filter || 'none' }} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: 'var(--text-main)', fontWeight: 500, margin: 0, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.title}
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '2px 0 0' }}>Qty: {item.quantity}</p>
                          </div>
                          <span style={{ fontWeight: 600, flexShrink: 0 }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      );
                    })}
                    {order.shippingAddress && (
                      <div style={{ marginTop: '14px', padding: '12px', background: 'var(--bg-input)', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>📍 Shipping Address:</strong>
                        <span>{order.shippingAddress.name} — {order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.zip}</span>
                      </div>
                    )}
                  </div>

                  {/* Tracking Details & Status Stepper */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-glass)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                    
                    {/* Stepper Header */}
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>
                        Live Order Progress
                      </span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'var(--bg-input)', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {order.paymentMethod === 'cod' ? 'COD Order' : order.paymentMethod === 'upi' ? 'UPI' : 'Paid Card'}
                      </span>
                    </div>

                    {/* Stepper Graphic */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', position: 'relative' }}>
                      {/* Horizontal Line connector */}
                      <div style={{
                        position: 'absolute', top: '22px', left: '15%', right: '15%', height: '2px',
                        background: 'var(--border-color)', zIndex: 1
                      }} />
                      {renderStatusStep(order.status, 'Processing')}
                      {renderStatusStep(order.status, 'Shipped')}
                      {renderStatusStep(order.status, 'Delivered')}
                    </div>

                    {/* Countdown and Carrier Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Estimated Delivery:</span>
                        <strong style={{ color: 'var(--text-main)' }}>
                          {calculateEstDelivery(order.date)}
                        </strong>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Courier Partner:</span>
                        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Aura Express Delivery</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tracking Number:</span>
                        <code style={{ color: 'var(--primary)', fontWeight: 700 }}>
                          AXP-{order.id.split('-')[2] || '9874'}-902
                        </code>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Current Station:</span>
                        <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                          {order.status === 'Processing' ? 'Chennai Sort Facility' : order.status === 'Shipped' ? 'In transit (Bengaluru Hub)' : 'Delivered'}
                        </span>
                      </div>

                      {order.status !== 'Delivered' && (
                        <div style={{ 
                          marginTop: '6px', 
                          padding: '10px', 
                          background: 'var(--primary-glow)', 
                          border: '1px dashed var(--primary)', 
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Next status shift:</span>
                          <CountdownTracker orderId={order.id} orderStatus={order.status} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'wishlist' ? (
        /* Wishlist Grid */
        <div>
          {wishlist.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '18px', margin: 0 }}>My Saved Wishlist ({wishlist.length})</h3>
              <button 
                onClick={() => {
                  const titles = wishlist.map(p => `• ${p.title} (₹${p.price})`).join('\n')
                  const text = encodeURIComponent(`Check out my AuraShop Wishlist:\n\n${titles}\n\nShop on AuraShop!`)
                  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
                }}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', border: '1px solid #25D366', color: '#25D366', cursor: 'pointer', background: 'rgba(37, 211, 102, 0.1)' }}
              >
                <span>💬</span> Share Wishlist on WhatsApp
              </button>
            </div>
          )}
          {wishlist.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <span style={{ fontSize: '48px' }}>❤️</span>
              <h3 style={{ fontSize: '18px', marginTop: '16px' }}>Your Wishlist is Empty</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Save items from the catalog to see them here.</p>
              <Link to="/products" className="btn-primary" style={{ marginTop: '16px', display: 'inline-block' }}>
                Browse Catalog
              </Link>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '24px'
            }}>
              {wishlist.map(product => (
                <div
                  key={product.id}
                  className="glass-panel"
                  style={{
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    background: 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                  }}
                >
                  {/* Remove Button */}
                  <button
                    onClick={() => handleToggleWishlist(product.id)}
                    style={{
                      position: 'absolute', top: '12px', right: '12px',
                      background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                      width: '32px', height: '32px', borderRadius: '50%',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3
                    }}
                  >
                    ❌
                  </button>

                  <div style={{ background: '#fff', borderRadius: 'var(--radius-sm)', padding: '12px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <img src={product.image} alt={product.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>

                  <span style={{ color: 'var(--primary)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                    {product.category}
                  </span>
                  <h4 style={{
                    fontSize: '14px', margin: '0 0 8px', height: '38px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                  }}>
                    {product.title}
                  </h4>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '18px' }}>₹{product.price}</span>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px', borderRadius: 'var(--radius-sm)', boxShadow: 'none' }}
                    >
                      Add +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'addresses' ? (
        /* Saved Addresses Panel */
        <div className="cart-grid">
          {/* Saved Addresses List */}
          <div>
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Your Saved Delivery Addresses</h3>
            {addresses.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No saved addresses found. Add one using the form on the right.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {addresses.map(addr => (
                  <div 
                    key={addr.id}
                    className="glass-panel"
                    style={{
                      padding: '20px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      position: 'relative'
                    }}
                  >
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      style={{
                        position: 'absolute', top: '16px', right: '16px',
                        background: 'none', border: 'none', color: 'var(--accent)',
                        cursor: 'pointer', fontSize: '13px', fontWeight: 600
                      }}
                    >
                      Delete 🗑️
                    </button>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>{addr.name}</h4>
                    <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.4 }}>{addr.address}</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.4 }}>{addr.city}, {addr.zip}</p>
                    {addr.phone && <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>📞 Phone: {addr.phone}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Address Form */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              Add a New Address
            </h3>
            <form onSubmit={handleAddAddress} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Contact Name</label>
                <input 
                  type="text" required placeholder="John Doe"
                  value={newAddr.name} onChange={e => setNewAddr(prev => ({ ...prev, name: e.target.value }))}
                  className="form-input"
                  style={{ padding: '10px', fontSize: '13px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Street Address</label>
                <input 
                  type="text" required placeholder="123 Main St, Apt 4"
                  value={newAddr.address} onChange={e => setNewAddr(prev => ({ ...prev, address: e.target.value }))}
                  className="form-input"
                  style={{ padding: '10px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>City</label>
                  <input 
                    type="text" required placeholder="Chennai"
                    value={newAddr.city} onChange={e => setNewAddr(prev => ({ ...prev, city: e.target.value }))}
                    className="form-input"
                    style={{ padding: '10px', fontSize: '13px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>ZIP / Postal Code</label>
                  <input 
                    type="text" required placeholder="600001"
                    value={newAddr.zip} onChange={e => setNewAddr(prev => ({ ...prev, zip: e.target.value }))}
                    className="form-input"
                    style={{ padding: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Phone Number (Optional)</label>
                <input 
                  type="text" placeholder="+91 98765 43210"
                  value={newAddr.phone} onChange={e => setNewAddr(prev => ({ ...prev, phone: e.target.value }))}
                  className="form-input"
                  style={{ padding: '10px', fontSize: '13px' }}
                />
              </div>

              <button 
                type="submit" className="btn-primary" disabled={addingAddr}
                style={{ width: '100%', padding: '12px', fontSize: '14px', marginTop: '8px' }}
              >
                {addingAddr ? 'Saving Address...' : 'Save Address'}
              </button>
            </form>
          </div>
        </div>
      ) : activeTab === 'admin' && user?.email === 'praveen542spk@gmail.com' ? (
        /* Admin Portal Panel */
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '32px', alignItems: 'start' }}>
          {/* Sub-Tabs Left Navigation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { id: 'stats', label: '📊 Dashboard Stats' },
              { id: 'orders', label: '📦 Order Manager' },
              { id: 'products', label: '👕 Product Directory' },
              { id: 'low-stock', label: '⚠️ Low Stock Alerts' },
              { id: 'coupons', label: '🏷️ Promo Coupons' },
              { id: 'customers', label: '👥 Customer Directory' },
              { id: 'reviews', label: '⭐ Review Moderation' },
              { id: 'settings', label: '⚙️ Live Settings' },
              { id: 'logs', label: '📜 Activity Logs' }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setAdminActiveSubTab(sub.id)}
                style={{
                  textAlign: 'left', border: 'none', padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)', fontSize: '14px', cursor: 'pointer',
                  fontWeight: adminActiveSubTab === sub.id ? 700 : 500,
                  color: adminActiveSubTab === sub.id ? 'var(--text-on-primary)' : 'var(--text-muted)',
                  background: adminActiveSubTab === sub.id ? 'var(--primary)' : 'transparent',
                  transition: 'all var(--transition-fast)',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (adminActiveSubTab !== sub.id) e.currentTarget.style.background = 'var(--bg-input)'
                }}
                onMouseLeave={(e) => {
                  if (adminActiveSubTab !== sub.id) e.currentTarget.style.background = 'transparent'
                }}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Sub-Tab Content Right Panel */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 1. Stats & Overview */}
            {adminActiveSubTab === 'stats' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Analytics Overview</h3>
                
                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  {[
                    { title: 'Total Revenue', value: `₹${(adminStats?.totalSales || 0).toLocaleString('en-IN')}`, color: 'var(--primary)', desc: 'From all orders' },
                    { title: 'Total Orders', value: adminStats?.totalOrders || 0, color: 'var(--accent)', desc: 'Placed in shop' },
                    { title: 'Out of Stock Items', value: adminStats?.outOfStockCount || 0, color: 'rgb(239, 68, 68)', desc: 'Need restock' },
                    { title: 'Active Customers', value: adminStats?.totalUsers || 0, color: 'rgb(16, 185, 129)', desc: 'Registered accounts' }
                  ].map((card, i) => (
                    <div key={i} className="glass-panel" style={{ padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{card.title}</span>
                      <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 4px', color: card.color }}>{card.value}</h2>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{card.desc}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', flexWrap: 'wrap' }}>
                  {/* Top Selling Products */}
                  <div className="glass-panel" style={{ padding: '24px', background: 'var(--bg-card)' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                      🔥 Top Selling Products
                    </h4>
                    {(!adminStats?.topSellingProducts || adminStats.topSellingProducts.length === 0) ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No sales data recorded yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {adminStats.topSellingProducts.map((p, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.title}</span>
                            <span style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                              {p.salesCount} sold
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Backoffice Options */}
                  <div className="glass-panel" style={{ padding: '24px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>
                      ⚡ Quick Operations
                    </h4>
                    <button onClick={handleDownloadBackup} className="btn-secondary" style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 600 }}>
                      📥 Download Database Backup (.JSON)
                    </button>
                    {adminStats?.lowStockCount > 0 && (
                      <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px', fontSize: '13px', color: 'rgb(239, 68, 68)' }}>
                        ⚠️ There are <strong>{adminStats.lowStockCount}</strong> products running low on stock! Go to the Low Stock Alerts tab to restock them.
                      </div>
                    )}
                  </div>
                </div>

                {/* Category Inventory Breakdown */}
                <div className="glass-panel" style={{ padding: '24px', background: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    📦 Catalog Distribution by Category
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {adminStats?.categoryStats && Object.keys(adminStats.categoryStats).map((cat, idx) => (
                      <div key={idx} style={{ padding: '8px 16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '16px', fontSize: '13px' }}>
                        <strong>{cat}</strong>: {adminStats.categoryStats[cat]} products
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Order Manager */}
            {adminActiveSubTab === 'orders' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Order Manager</h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                      type="text" placeholder="Search orders by ID..."
                      value={orderSearchText} onChange={e => setOrderSearchText(e.target.value)}
                      className="form-input" style={{ width: '220px', height: '36px', fontSize: '13px', padding: '6px 12px' }}
                    />
                    <button onClick={handleExportCSV} className="btn-primary" style={{ padding: '0 16px', height: '36px', fontSize: '13px', fontWeight: 600 }}>
                      📊 Export CSV Report
                    </button>
                  </div>
                </div>

                <div className="glass-panel" style={{ background: 'var(--bg-card)', overflowX: 'auto', borderRadius: 'var(--radius-sm)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-input)' }}>
                        <th style={{ padding: '12px 16px' }}>Order ID</th>
                        <th style={{ padding: '12px 16px' }}>Date</th>
                        <th style={{ padding: '12px 16px' }}>Customer</th>
                        <th style={{ padding: '12px 16px' }}>Amount</th>
                        <th style={{ padding: '12px 16px' }}>Method</th>
                        <th style={{ padding: '12px 16px' }}>Status</th>
                        <th style={{ padding: '12px 16px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminOrders.filter(o => o.id.toLowerCase().includes(orderSearchText.toLowerCase())).map(order => (
                        <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{order.id}</td>
                          <td style={{ padding: '12px 16px' }}>{order.date}</td>
                          <td style={{ padding: '12px 16px' }}>{order.shippingAddress?.name || 'Guest'}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--primary)' }}>₹{order.amount.toFixed(2)}</td>
                          <td style={{ padding: '12px 16px', textTransform: 'uppercase' }}>{order.paymentMethod || 'Stripe'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <select
                              value={order.status}
                              onChange={e => handleUpdateOrderStatus(order.id, e.target.value)}
                              style={{
                                padding: '4px 8px', borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                background: order.status === 'Delivered' ? '#d1fae5' : order.status === 'Shipped' ? '#dbeafe' : '#fee2e2',
                                color: order.status === 'Delivered' ? '#065f46' : order.status === 'Shipped' ? '#1e40af' : '#991b1b',
                                fontWeight: 700, cursor: 'pointer', fontSize: '12px'
                              }}
                            >
                              <option value="Processing">Processing</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <button 
                              onClick={() => {
                                const details = order.items.map(i => `- ${i.title} (Qty: ${i.quantity})`).join('\n');
                                const addr = order.shippingAddress 
                                  ? `Shipping Address:\n${order.shippingAddress.name}\n${order.shippingAddress.address}, ${order.shippingAddress.city} - ${order.shippingAddress.zip}\nPhone: ${order.shippingAddress.phone || 'N/A'}`
                                  : 'No Address (Stripe Guest Checkout)'
                                alert(`Order Items:\n${details}\n\n${addr}`);
                              }}
                              className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. Product Directory */}
            {adminActiveSubTab === 'products' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Product Catalog Directory</h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                      type="text" placeholder="Search products..."
                      value={productSearchText} onChange={e => setProductSearchText(e.target.value)}
                      className="form-input" style={{ width: '220px', height: '36px', fontSize: '13px', padding: '6px 12px' }}
                    />
                    <button 
                      onClick={() => setShowAddForm(p => !p)} 
                      className="btn-primary" style={{ padding: '0 16px', height: '36px', fontSize: '13px', fontWeight: 600 }}
                    >
                      {showAddForm ? 'Hide Form' : '➕ Add Product'}
                    </button>
                  </div>
                </div>

                {/* Optional Add Product Form */}
                {showAddForm && (
                  <div className="glass-panel" style={{ padding: '24px', background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', margin: 0 }}>Add New Product details</h4>
                    <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Product Title</label>
                          <input type="text" required placeholder="e.g. Classic Cap" value={adminProduct.title} onChange={e => setAdminProduct(p => ({ ...p, title: e.target.value }))} className="form-input" style={{ padding: '8px', fontSize: '13px' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Price (₹)</label>
                            <input type="number" required min="1" placeholder="499" value={adminProduct.price} onChange={e => setAdminProduct(p => ({ ...p, price: e.target.value }))} className="form-input" style={{ padding: '8px', fontSize: '13px' }} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Stock</label>
                            <input type="number" required min="0" placeholder="10" value={adminProduct.stock} onChange={e => setAdminProduct(p => ({ ...p, stock: e.target.value }))} className="form-input" style={{ padding: '8px', fontSize: '13px' }} />
                          </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Category</label>
                          <select value={adminProduct.category} onChange={e => setAdminProduct(p => ({ ...p, category: e.target.value }))} className="form-input" style={{ padding: '8px', fontSize: '13px' }}>
                            <option value="electronics">Electronics</option>
                            <option value="jewelery">Jewelery</option>
                            <option value="men's clothing">Men's Clothing</option>
                            <option value="women's clothing">Women's Clothing</option>
                            <option value="custom">Custom...</option>
                          </select>
                        </div>
                        {adminProduct.category === 'custom' && (
                          <input type="text" required placeholder="Specify Category" value={adminProduct.customCategory} onChange={e => setAdminProduct(p => ({ ...p, customCategory: e.target.value }))} className="form-input" style={{ padding: '8px', fontSize: '13px' }} />
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Image URL</label>
                          <input type="url" required placeholder="https://..." value={adminProduct.image} onChange={e => setAdminProduct(p => ({ ...p, image: e.target.value }))} className="form-input" style={{ padding: '8px', fontSize: '13px' }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Description</label>
                          <textarea required placeholder="Enter description..." value={adminProduct.description} onChange={e => setAdminProduct(p => ({ ...p, description: e.target.value }))} className="form-input" style={{ padding: '8px', fontSize: '13px', resize: 'vertical', flex: 1, minHeight: '60px' }} />
                        </div>
                        <button type="submit" className="btn-primary" disabled={submittingAdmin} style={{ padding: '10px', fontSize: '13px', fontWeight: 700, width: '100%' }}>
                          {submittingAdmin ? 'Adding...' : 'Add Product'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="glass-panel" style={{ background: 'var(--bg-card)', overflowX: 'auto', borderRadius: 'var(--radius-sm)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-input)' }}>
                        <th style={{ padding: '12px 16px' }}>Image</th>
                        <th style={{ padding: '12px 16px' }}>Title</th>
                        <th style={{ padding: '12px 16px' }}>Category</th>
                        <th style={{ padding: '12px 16px' }}>Price</th>
                        <th style={{ padding: '12px 16px' }}>Stock</th>
                        <th style={{ padding: '12px 16px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.filter(p => p.title.toLowerCase().includes(productSearchText.toLowerCase())).map(product => (
                        <tr key={product.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '8px 16px' }}>
                            <div style={{ width: '36px', height: '36px', background: 'white', padding: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img src={product.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.title}</td>
                          <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{product.category}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700 }}>₹{product.price}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                              background: (product.stock || 0) <= 0 ? '#fee2e2' : (product.stock || 0) <= 3 ? '#fef3c7' : '#d1fae5',
                              color: (product.stock || 0) <= 0 ? '#991b1b' : (product.stock || 0) <= 3 ? '#92400e' : '#065f46'
                            }}>
                              {product.stock !== undefined ? product.stock : 10}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => setEditingProduct(product)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer' }}>Edit</button>
                              <button onClick={() => handleDeleteProduct(product.id)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', background: 'none', border: '1px solid rgba(239, 68, 68, 0.4)', color: 'rgb(239, 68, 68)', cursor: 'pointer' }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. Low Stock Alerts */}
            {adminActiveSubTab === 'low-stock' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Low Stock Alerts</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>The following catalog products are either out of stock or low in inventory (stock count &le; 3). Quick-restock them instantly.</p>

                {products.filter(p => p.stock !== undefined && p.stock <= 3).length === 0 ? (
                  <div style={{ padding: '40px', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <span style={{ fontSize: '32px' }}>🟢</span>
                    <h4 style={{ fontSize: '16px', margin: '12px 0 4px', fontWeight: 700 }}>Inventory Healthy</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>No products currently have low stock levels.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {products.filter(p => p.stock !== undefined && p.stock <= 3).map(product => (
                      <div key={product.id} className="glass-panel" style={{ padding: '16px 20px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '48px', height: '48px', background: 'white', padding: '3px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <img src={product.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          </div>
                          <div>
                            <h4 style={{ fontSize: '14px', margin: 0, fontWeight: 700 }}>{product.title}</h4>
                            <span style={{
                              display: 'inline-block', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', marginTop: '4px',
                              background: (product.stock || 0) <= 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: (product.stock || 0) <= 0 ? 'rgb(239, 68, 68)' : 'rgb(245, 158, 11)'
                            }}>
                              {(product.stock || 0) <= 0 ? 'Out of Stock' : `Low Stock: Only ${product.stock} left`}
                            </span>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleQuickRestock(product, 10)}
                          className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 700 }}
                        >
                          ➕ Restock +10 Units
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. Promo Coupons */}
            {adminActiveSubTab === 'coupons' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', flexWrap: 'wrap' }}>
                {/* Left: Add Coupon */}
                <div className="glass-panel" style={{ padding: '24px', background: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', margin: 0 }}>Add New Coupon Code</h4>
                  <form onSubmit={handleAddCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Coupon Code</label>
                      <input 
                        type="text" required placeholder="e.g. DISCOUNT50"
                        value={couponCode} onChange={e => setCouponCode(e.target.value)}
                        className="form-input" style={{ padding: '10px', fontSize: '13px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Discount Rate (%)</label>
                      <input 
                        type="number" required min="1" max="100" placeholder="e.g. 50"
                        value={couponDiscount} onChange={e => setCouponDiscount(e.target.value)}
                        className="form-input" style={{ padding: '10px', fontSize: '13px' }}
                      />
                    </div>
                    <button type="submit" className="btn-primary" style={{ padding: '12px', fontSize: '13px', fontWeight: 700 }}>
                      Create Promo Code
                    </button>
                  </form>
                </div>

                {/* Right: Active Coupon Codes list */}
                <div className="glass-panel" style={{ padding: '24px', background: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', margin: 0 }}>Active Promo Coupons</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                    {adminCoupons.map((c, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                        <div>
                          <strong style={{ fontSize: '14px', color: 'var(--primary)' }}>{c.code}</strong>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>({c.discountRate * 100}% discount)</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteCoupon(c.code)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px' }}
                        >
                          Delete 🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 6. Customer Directory */}
            {adminActiveSubTab === 'customers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Registered Customers Directory</h3>
                  <input 
                    type="text" placeholder="Search customers by name or email..."
                    value={customerSearchText} onChange={e => setCustomerSearchText(e.target.value)}
                    className="form-input" style={{ width: '250px', height: '36px', fontSize: '13px', padding: '6px 12px' }}
                  />
                </div>

                <div className="glass-panel" style={{ background: 'var(--bg-card)', overflowX: 'auto', borderRadius: 'var(--radius-sm)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-input)' }}>
                        <th style={{ padding: '12px 16px' }}>Customer ID</th>
                        <th style={{ padding: '12px 16px' }}>Name</th>
                        <th style={{ padding: '12px 16px' }}>Email Address</th>
                        <th style={{ padding: '12px 16px' }}>Orders Placed</th>
                        <th style={{ padding: '12px 16px' }}>Total Amount Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.filter(u => u.name.toLowerCase().includes(customerSearchText.toLowerCase()) || u.email.toLowerCase().includes(customerSearchText.toLowerCase())).map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{c.id}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.name}</td>
                          <td style={{ padding: '12px 16px' }}>{c.email}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700 }}>{c.orderCount}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--primary)' }}>₹{c.totalSpent.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. Reviews Moderation */}
            {adminActiveSubTab === 'reviews' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Customer Reviews Moderation</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Moderate and delete customer-submitted product reviews from the store database.</p>

                <div className="glass-panel" style={{ padding: '24px', background: 'var(--bg-card)' }}>
                  {adminReviews.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No customer reviews found.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-input)' }}>
                            <th style={{ padding: '12px 16px' }}>Product</th>
                            <th style={{ padding: '12px 16px' }}>Customer</th>
                            <th style={{ padding: '12px 16px' }}>Rating</th>
                            <th style={{ padding: '12px 16px' }}>Comment</th>
                            <th style={{ padding: '12px 16px' }}>Date</th>
                            <th style={{ padding: '12px 16px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminReviews.map(r => {
                            const prod = products.find(p => p.id === r.productId)
                            return (
                              <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{prod ? prod.title : `Product ID: ${r.productId}`}</td>
                                <td style={{ padding: '12px 16px' }}>
                                  <div>{r.userName}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.userEmail}</div>
                                </td>
                                <td style={{ padding: '12px 16px', color: 'var(--gold-dark)', fontWeight: 700 }}>
                                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                                </td>
                                <td style={{ padding: '12px 16px', fontStyle: 'italic' }}>"{r.comment}"</td>
                                <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{r.date}</td>
                                <td style={{ padding: '12px 16px' }}>
                                  <button 
                                    onClick={() => handleDeleteReview(r.id)}
                                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                                  >
                                    Delete 🗑️
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 8. Live Settings Config */}
            {adminActiveSubTab === 'settings' && (
              <div className="glass-panel" style={{ padding: '32px', background: 'var(--bg-card)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Store Backoffice Settings</h3>
                
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const targetUpi = e.target.elements.upiId.value;
                    const targetEmail = e.target.elements.notifyEmail.value;
                    const targetStripe = e.target.elements.stripeEnabled.checked;
                    handleUpdateConfig({
                      upiId: targetUpi,
                      notifyEmail: targetEmail,
                      stripeEnabled: targetStripe
                    });
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px', maxWidth: '500px' }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Default UPI ID (for QR payment)</label>
                    <input 
                      type="text" name="upiId" required defaultValue={adminStats?.config?.upiId || '6374060801@ibl'}
                      className="form-input" style={{ padding: '10px', fontSize: '13px' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Admin Notification Email Recipient</label>
                    <input 
                      type="email" name="notifyEmail" required defaultValue={adminStats?.config?.notifyEmail || 'praveen542spk@gmail.com'}
                      className="form-input" style={{ padding: '10px', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                    <input 
                      type="checkbox" name="stripeEnabled" id="stripeEnabled" defaultChecked={adminStats?.config?.stripeEnabled}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="stripeEnabled" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Enable Mock Stripe Card Option (Simulated Card Payment)</label>
                  </div>

                  <button type="submit" className="btn-primary" style={{ padding: '12px 24px', fontSize: '13px', fontWeight: 700, alignSelf: 'flex-start', marginTop: '10px' }}>
                    Save Configuration Settings
                  </button>
                </form>
              </div>
            )}

            {/* 9. Activity Logs */}
            {adminActiveSubTab === 'logs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Admin Activity Logs</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Real-time audit log tracking store administrative and transaction events.</p>

                <div className="glass-panel" style={{ padding: '24px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '500px', overflowY: 'auto' }}>
                  {(!adminStats?.recentLogs || adminStats.recentLogs.length === 0) ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No audit logs recorded yet.</p>
                  ) : (
                    adminStats.recentLogs.map((log) => (
                      <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                        <div>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', marginRight: '10px', textTransform: 'uppercase',
                            background: log.type === 'order' ? '#dbeafe' : log.type === 'product' ? '#fef3c7' : '#e0e7ff',
                            color: log.type === 'order' ? '#1e40af' : log.type === 'product' ? '#92400e' : '#3730a3'
                          }}>
                            {log.type}
                          </span>
                          <span style={{ color: 'var(--text-main)' }}>{log.message}</span>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', flexShrink: 0 }}>{log.date}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
          </div>
        </div>
      ) : null}

      {/* Feature 14: Quick Edit Product Modal */}
      {editingProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 25, 35, 0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '28px', background: 'var(--bg-card)', position: 'relative' }}>
            <button 
              onClick={() => setEditingProduct(null)} 
              style={{ 
                position: 'absolute', top: '16px', right: '16px', 
                background: 'var(--bg-input)', border: 'none', 
                color: 'var(--text-main)', cursor: 'pointer', 
                width: '32px', height: '32px', borderRadius: '50%', 
                fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}
            >
              &times;
            </button>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', fontWeight: 700 }}>Quick Edit Product</h3>
            <form onSubmit={handleUpdateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Product Title</label>
                <input 
                  type="text" required 
                  value={editingProduct.title} 
                  onChange={e => setEditingProduct(prev => ({ ...prev, title: e.target.value }))}
                  className="form-input" style={{ padding: '10px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Price (₹)</label>
                  <input 
                    type="number" required min="1" 
                    value={editingProduct.price} 
                    onChange={e => setEditingProduct(prev => ({ ...prev, price: e.target.value }))}
                    className="form-input" style={{ padding: '10px', fontSize: '13px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Stock</label>
                  <input 
                    type="number" required min="0" 
                    value={editingProduct.stock} 
                    onChange={e => setEditingProduct(prev => ({ ...prev, stock: e.target.value }))}
                    className="form-input" style={{ padding: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Category</label>
                <input 
                  type="text" required 
                  value={editingProduct.category} 
                  onChange={e => setEditingProduct(prev => ({ ...prev, category: e.target.value }))}
                  className="form-input" style={{ padding: '10px', fontSize: '13px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Image URL</label>
                <input 
                  type="url" required 
                  value={editingProduct.image} 
                  onChange={e => setEditingProduct(prev => ({ ...prev, image: e.target.value }))}
                  className="form-input" style={{ padding: '10px', fontSize: '13px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Description</label>
                <textarea 
                  required rows="3" 
                  value={editingProduct.description} 
                  onChange={e => setEditingProduct(prev => ({ ...prev, description: e.target.value }))}
                  className="form-input" style={{ padding: '10px', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ padding: '12px', fontSize: '13px', fontWeight: 700, marginTop: '10px' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Printable Invoice Modal */}
      {selectedInvoiceOrder && createPortal(
        <div className="invoice-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10, 10, 15, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000,
          padding: '20px', overflowY: 'auto'
        }}>
          <div className="glass-panel printable-invoice-container" style={{ 
            width: '100%', maxWidth: '800px', padding: '40px', 
            background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
            position: 'relative', display: 'flex', flexDirection: 'column', gap: '24px'
          }}>
            {/* Modal Actions Header */}
            <div className="invoice-actions-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => window.print()} 
                  className="btn-primary" 
                  style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 700 }}
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Print Invoice (PDF)
                </button>
              </div>
              <button 
                onClick={() => setSelectedInvoiceOrder(null)} 
                className="btn-secondary" 
                style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600 }}
              >
                Close
              </button>
            </div>

            {/* Actual Invoice Content */}
            <div className="invoice-print-area" style={{ display: 'flex', flexDirection: 'column', gap: '30px', color: 'var(--text-main)' }}>
              
              {/* Brand Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--primary)', paddingBottom: '20px' }}>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
                    AuraShop
                  </h1>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>The Premium E-Commerce Experience</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', margin: 0, color: 'var(--primary)' }}>Tax Invoice</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Invoice No: AUR-INV-{selectedInvoiceOrder.id.split('-')[2] || '9874'}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date: {selectedInvoiceOrder.date}</p>
                </div>
              </div>

              {/* Addresses Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', fontSize: '13px' }}>
                <div>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Seller Details</h4>
                  <strong>AuraShop India Private Ltd.</strong>
                  <p style={{ color: 'var(--text-muted)', lineHeight: 1.4, margin: '4px 0 0' }}>
                    Plot 12, Tech Boulevard, Sector 4<br />
                    IT Park Hub, Bengaluru, Karnataka - 560001<br />
                    GSTIN: 29AABCA1234F1Z0<br />
                    Email: support@aurashop.in
                  </p>
                </div>
                <div>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Buyer Details (Bill To)</h4>
                  {selectedInvoiceOrder.shippingAddress ? (
                    <>
                      <strong>{selectedInvoiceOrder.shippingAddress.name}</strong>
                      <p style={{ color: 'var(--text-muted)', lineHeight: 1.4, margin: '4px 0 0' }}>
                        {selectedInvoiceOrder.shippingAddress.address}<br />
                        {selectedInvoiceOrder.shippingAddress.city} - {selectedInvoiceOrder.shippingAddress.zip}<br />
                        Phone: {selectedInvoiceOrder.shippingAddress.phone || 'N/A'}<br />
                        Email: {user?.email}
                      </p>
                    </>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No shipping address provided.</p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--primary)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: 700 }}>Product Description</th>
                    <th style={{ textAlign: 'center', padding: '10px 0', width: '80px', fontWeight: 700 }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '10px 0', width: '120px', fontWeight: 700 }}>Unit Price</th>
                    <th style={{ textAlign: 'right', padding: '10px 0', width: '120px', fontWeight: 700 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoiceOrder.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 0', fontWeight: 500, color: 'var(--text-main)' }}>
                        {item.title}
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)' }}>
                        {item.quantity}
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px 0', color: 'var(--text-muted)' }}>
                        ₹{item.price.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px 0', fontWeight: 600, color: 'var(--text-main)' }}>
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary and QR section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px', borderTop: '2px solid var(--border-color)', paddingTop: '20px' }}>
                {/* QR Code Validation */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  {/* Beautiful Mock SVG QR Code */}
                  <svg width="70" height="70" viewBox="0 0 100 100" style={{ background: '#ffffff', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <path d="M5,5 h30 v30 h-30 z M15,15 h10 v10 h-10 z M65,5 h30 v30 h-30 z M75,15 h10 v10 h-10 z M5,65 h30 v30 h-30 z M15,75 h10 v10 h-10 z" fill="#090a0f" />
                    <path d="M45,15 h10 v10 h-10 z M45,35 h10 v15 h-10 z M55,5 h10 v10 h-10 z M65,45 h15 v10 h-15 z M5,45 h10 v10 h-10 z M25,45 h10 v10 h-10 z M35,55 h10 v15 h-10 z M45,75 h15 v10 h-15 z M65,65 h10 v10 h-10 z M85,65 h10 v10 h-10 z M75,85 h10 v10 h-10 z" fill="#090a0f" />
                  </svg>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '2px' }}>Verify Invoice</strong>
                    Scan this secure code to verify payment status, product authenticity, and receipt warranty.
                  </div>
                </div>

                {/* Totals table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                    <span>₹{(selectedInvoiceOrder.amount / 1.08).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Tax (8%):</span>
                    <span>₹{(selectedInvoiceOrder.amount - (selectedInvoiceOrder.amount / 1.08)).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', fontSize: '16px', fontWeight: 700 }}>
                    <span style={{ color: (selectedInvoiceOrder.paymentMethod === 'cod' && selectedInvoiceOrder.status !== 'Delivered') ? 'var(--secondary)' : '#10b981' }}>
                      {(selectedInvoiceOrder.paymentMethod === 'cod' && selectedInvoiceOrder.status !== 'Delivered') ? 'Amount to Pay (COD):' : 'Amount Paid:'}
                    </span>
                    <span style={{ color: (selectedInvoiceOrder.paymentMethod === 'cod' && selectedInvoiceOrder.status !== 'Delivered') ? 'var(--secondary)' : '#10b981' }}>
                      ₹{selectedInvoiceOrder.amount.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '4px' }}>
                    Payment Mode: {selectedInvoiceOrder.paymentMethod === 'cod' ? 'Cash on Delivery' : selectedInvoiceOrder.paymentMethod === 'upi' ? 'UPI' : 'Credit Card'}
                  </div>
                </div>
              </div>

              {/* Invoice Footer */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                This is a computer-generated document and does not require a signature. Thank you for your business!
              </div>

            </div>
          </div>
        </div>
      , document.body)}
    </div>
  )
}

export default Dashboard
