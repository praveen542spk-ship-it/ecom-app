import { useState, useRef } from 'react'
import { useAuth } from '../services/AuthContext'
import { useLanguage } from '../services/LanguageContext'
import { useToast } from '../components/Toast'

function Settings() {
  const { user, updateUser } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const { addToast } = useToast()

  const fileInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('profile')
  
  // Helper to get stored user profile
  const getProfileField = (field, fallback) => {
    if (user?.email) {
      const saved = localStorage.getItem(`profile_details_${user.email}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed[field] !== undefined) return parsed[field]
        } catch (e) {
          console.error(e)
        }
      }
    }
    return user?.[field] || fallback
  }

  // 1. Profile State Features
  const [name, setName] = useState(() => getProfileField('name', user?.name || ''))
  const [email, setEmail] = useState(() => getProfileField('email', user?.email || ''))
  const [phone, setPhone] = useState(() => getProfileField('phone', user?.phone || '+91 98765 43210'))
  const [dob, setDob] = useState(() => getProfileField('dob', '2000-01-01'))
  const [gender, setGender] = useState(() => getProfileField('gender', 'Male'))
  const [bio, setBio] = useState(() => getProfileField('bio', 'Passionate shopper & tech enthusiast.'))
  const [avatar, setAvatar] = useState(() => getProfileField('avatar', user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'))

  // 2. Security State Features
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [twoFactor, setTwoFactor] = useState(false)
  const [securityPin, setSecurityPin] = useState('1234')
  const [sessions, setSessions] = useState([
    { id: 1, device: 'Chrome on Windows (Current)', ip: '192.168.1.1', time: 'Active now' },
    { id: 2, device: 'Safari on iPhone 14', ip: '10.0.0.42', time: '2 hours ago' }
  ])

  // 3. Preferences State Features
  const [currency, setCurrency] = useState('INR')
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [promoEmails, setPromoEmails] = useState(false)
  const [smsNotifs, setSmsNotifs] = useState(true)

  // 4. Payment Methods & Wallet State Features
  const [cards, setCards] = useState([
    { id: 1, type: 'Visa', last4: '4242', exp: '12/26', holder: name || 'Praveen' },
    { id: 2, type: 'Mastercard', last4: '8899', exp: '09/25', holder: name || 'Praveen' }
  ])
  const [upiId, setUpiId] = useState('6374060801@ibl')
  const [walletBalance, setWalletBalance] = useState(2500)
  const [showCardForm, setShowCardForm] = useState(false)
  const [newCardDetails, setNewCardDetails] = useState({ holder: '', number: '', exp: '', type: 'Visa' })

  // Wallet Top-up State
  const [showWalletForm, setShowWalletForm] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState('500')

  // Handlers
  const handleProfileUpdate = (e) => {
    e.preventDefault()
    const profileData = { name, email, phone, dob, gender, bio, avatar }
    if (user?.email) {
      localStorage.setItem(`profile_details_${user.email}`, JSON.stringify(profileData))
    }
    updateUser(profileData)
    addToast('Account profile updated successfully!', 'success')
  }

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const newAvatar = reader.result
        setAvatar(newAvatar)
        if (user?.email) {
          const saved = localStorage.getItem(`profile_details_${user.email}`)
          const parsed = saved ? JSON.parse(saved) : {}
          localStorage.setItem(`profile_details_${user.email}`, JSON.stringify({ ...parsed, avatar: newAvatar }))
        }
        updateUser({ avatar: newAvatar })
        addToast('Profile picture updated from gallery!', 'success')
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePasswordUpdate = (e) => {
    e.preventDefault()
    if (!currentPassword || !newPassword) {
      addToast('Please fill in all password fields.', 'warning')
      return
    }
    addToast('Password updated successfully!', 'success')
    setCurrentPassword('')
    setNewPassword('')
  }

  const handleRemoveSession = (id) => {
    setSessions(sessions.filter(s => s.id !== id))
    addToast('Device logged out successfully.', 'info')
  }

  const handleRemoveCard = (id) => {
    setCards(cards.filter(c => c.id !== id))
    addToast('Payment method removed.', 'info')
  }

  const handleAddCardSubmit = (e) => {
    e.preventDefault()
    if (!newCardDetails.number || !newCardDetails.exp) {
      addToast('Please fill in card number and expiry.', 'warning')
      return
    }
    const cleanNumber = newCardDetails.number.replace(/\s/g, '')
    const last4 = cleanNumber.slice(-4) || '1234'
    const cardType = cleanNumber.startsWith('4') ? 'Visa' : cleanNumber.startsWith('5') ? 'Mastercard' : 'RuPay'
    
    const newCard = { 
      id: Date.now(), 
      type: cardType, 
      last4: last4, 
      exp: newCardDetails.exp || '08/28', 
      holder: newCardDetails.holder || name || 'User' 
    }
    setCards([...cards, newCard])
    setShowCardForm(false)
    setNewCardDetails({ holder: '', number: '', exp: '', type: 'Visa' })
    addToast('New payment card added successfully!', 'success')
  }

  const handleRechargeWalletSubmit = (e) => {
    e.preventDefault()
    const amt = Number(rechargeAmount)
    if (!amt || amt <= 0) {
      addToast('Please enter a valid amount to recharge.', 'warning')
      return
    }
    setWalletBalance(prev => prev + amt)
    setShowWalletForm(false)
    addToast(`₹${amt.toLocaleString('en-IN')} added to Aura Wallet!`, 'success')
  }

  const handleDownloadData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ user, cards, upiId, preferences: { emailNotifs, promoEmails, language, currency } }, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", "aurashop_user_data.json")
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    addToast('Downloading account data package...', 'info')
  }

  return (
    <div className="app-container" style={{ padding: '40px 20px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)' }}>settings</span>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{t('accountSettings')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Comprehensive control panel for security, languages, payments & preferences (15+ Features)</p>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '28px', alignItems: 'start' }}>
        
        {/* Navigation Sidebar */}
        <div className="glass-panel" style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              borderRadius: 'var(--radius-sm)', border: 'none',
              background: activeTab === 'profile' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'profile' ? 'var(--text-on-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'profile' ? 700 : 500, fontSize: '14px', cursor: 'pointer', marginBottom: '4px', transition: 'all 0.2s ease'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span>
            {t('profileInfo')}
          </button>

          <button
            onClick={() => setActiveTab('security')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              borderRadius: 'var(--radius-sm)', border: 'none',
              background: activeTab === 'security' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'security' ? 'var(--text-on-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'security' ? 700 : 500, fontSize: '14px', cursor: 'pointer', marginBottom: '4px', transition: 'all 0.2s ease'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>lock</span>
            {t('securityPassword')}
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              borderRadius: 'var(--radius-sm)', border: 'none',
              background: activeTab === 'preferences' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'preferences' ? 'var(--text-on-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'preferences' ? 700 : 500, fontSize: '14px', cursor: 'pointer', marginBottom: '4px', transition: 'all 0.2s ease'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>tune</span>
            {t('preferences')}
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              borderRadius: 'var(--radius-sm)', border: 'none',
              background: activeTab === 'payments' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'payments' ? 'var(--text-on-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'payments' ? 700 : 500, fontSize: '14px', cursor: 'pointer', marginBottom: '4px', transition: 'all 0.2s ease'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>credit_card</span>
            {t('savedCards')}
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              borderRadius: 'var(--radius-sm)', border: 'none',
              background: activeTab === 'privacy' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'privacy' ? 'var(--text-on-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'privacy' ? 700 : 500, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s ease'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>shield</span>
            {t('privacyData')}
          </button>
        </div>

        {/* Panel Content Area */}
        <div>
          {/* TAB 1: PROFILE INFO */}
          {activeTab === 'profile' && (
            <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>badge</span> {t('profileInfo')}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Feature 1-4: Update photo, contact information, bio and birthday</p>
              </div>

              {/* Feature 1: Avatar Gallery Uploader */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <img src={avatar} alt="Avatar" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Profile Photo</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 10px' }}>Upload photo directly from your device gallery</p>
                  
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                  
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary" 
                    style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '14px', cursor: 'pointer' }}
                  >
                    📷 Choose from Gallery
                  </button>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Feature 2: Name & Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Full Name</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="form-input" style={{ padding: '12px 16px', fontSize: '14px', width: '100%' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Email Address</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" style={{ padding: '12px 16px', fontSize: '14px', width: '100%' }} />
                  </div>
                </div>

                {/* Feature 3: Phone & Date of Birth */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Phone Number</label>
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" style={{ padding: '12px 16px', fontSize: '14px', width: '100%' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Date of Birth</label>
                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="form-input" style={{ padding: '12px 16px', fontSize: '14px', width: '100%' }} />
                  </div>
                </div>

                {/* Feature 4: Gender & Bio */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Gender</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="form-input" style={{ padding: '12px 16px', fontSize: '14px', width: '100%' }}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Short Bio</label>
                    <input type="text" value={bio} onChange={(e) => setBio(e.target.value)} className="form-input" style={{ padding: '12px 16px', fontSize: '14px', width: '100%' }} />
                  </div>
                </div>

                <div style={{ paddingTop: '8px' }}>
                  <button type="submit" className="btn-primary" style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 700 }}>{t('saveChanges')}</button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: SECURITY & AUTHENTICATION */}
          {activeTab === 'security' && (
            <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>key</span> {t('securityPassword')}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Feature 5-8: Password meter, 2FA toggle, Checkout PIN and active sessions</p>
              </div>

              {/* Feature 5: Password Form */}
              <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Current Password</label>
                  <input type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="form-input" style={{ padding: '12px 16px', fontSize: '14px', width: '100%' }} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>New Password</label>
                  <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="form-input" style={{ padding: '12px 16px', fontSize: '14px', width: '100%' }} />
                </div>

                <div>
                  <button type="submit" className="btn-secondary" style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 700, border: '1px solid var(--border-color)' }}>{t('updatePassword')}</button>
                </div>
              </form>

              {/* Feature 6 & 7: 2FA & Security PIN */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Advanced Security Switches</h3>
                
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>Two-Factor Verification (2FA)</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Send an authentication code to your phone on new logins</span>
                  </div>
                  <input type="checkbox" checked={twoFactor} onChange={(e) => setTwoFactor(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                </label>

                <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>Quick Checkout 4-Digit PIN</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Use PIN instead of password during 1-click checkout</span>
                  </div>
                  <input type="text" maxLength="4" value={securityPin} onChange={(e) => setSecurityPin(e.target.value)} className="form-input" style={{ width: '80px', textAlign: 'center', fontSize: '16px', fontWeight: 700, letterSpacing: '4px' }} />
                </div>
              </div>

              {/* Feature 8: Active Login Sessions */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Active Logged-in Sessions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sessions.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>💻 {s.device}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>IP: {s.ip} • {s.time}</span>
                      </div>
                      {s.id !== 1 && (
                        <button onClick={() => handleRemoveSession(s.id)} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px', color: '#ef4444', border: '1px solid #ef4444' }}>Revoke</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCES & CUSTOMIZATION */}
          {activeTab === 'preferences' && (
            <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>notifications</span> {t('preferences')}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Feature 9-13: 5 Languages, Currencies, and notification channels</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Feature 9: 5-LANGUAGE SELECTOR (English, Tamil, Telugu, Hindi, German) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '2px solid var(--primary)' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>🌐 {t('displayLanguage')}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('selectLanguage')}</span>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value)
                      addToast(`Language updated to ${e.target.value}`, 'success')
                    }}
                    className="form-input"
                    style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', width: 'auto', background: 'var(--primary)', color: '#fff' }}
                  >
                    <option value="English">English</option>
                    <option value="Tamil">தமிழ் (Tamil)</option>
                    <option value="Telugu">తెలుగు (Telugu)</option>
                    <option value="Hindi">हिंदी (Hindi)</option>
                    <option value="German">Deutsch (German)</option>
                  </select>
                </div>

                {/* Feature 10: Preferred Currency Selector */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>💱 Preferred Currency</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Select default display currency for product prices</span>
                  </div>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="form-input" style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', width: 'auto' }}>
                    <option value="INR">₹ INR (Indian Rupee)</option>
                    <option value="USD">$ USD (US Dollar)</option>
                    <option value="EUR">€ EUR (Euro)</option>
                  </select>
                </div>

                {/* Feature 11, 12, 13: Notification Toggles */}
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>Order Status Email Notifications</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Receive updates on order processing and shipping</span>
                  </div>
                  <input type="checkbox" checked={emailNotifs} onChange={(e) => setEmailNotifs(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>Promotional Deals & Discounts</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Get notified about seasonal sales and exclusive offers</span>
                  </div>
                  <input type="checkbox" checked={promoEmails} onChange={(e) => setPromoEmails(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>SMS Order Alerts</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Get SMS notifications on delivery progress</span>
                  </div>
                  <input type="checkbox" checked={smsNotifs} onChange={(e) => setSmsNotifs(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENT METHODS & WALLET */}
          {activeTab === 'payments' && (
            <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>credit_card</span> {t('savedCards')}
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Feature 14-15: Credit cards manager and Aura Wallet balance</p>
                </div>
                <button onClick={() => setShowCardForm(!showCardForm)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700 }}>
                  {showCardForm ? 'Cancel' : '+ Add Card'}
                </button>
              </div>

              {/* Feature 14: Interactive Card Form */}
              {showCardForm && (
                <form onSubmit={handleAddCardSubmit} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Add New Credit/Debit Card</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cardholder Name</label>
                      <input type="text" required placeholder="Praveen Kumar" value={newCardDetails.holder} onChange={e => setNewCardDetails(prev => ({ ...prev, holder: e.target.value }))} className="form-input" style={{ padding: '10px', fontSize: '13px', width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Card Number</label>
                      <input type="text" required placeholder="4242 4242 4242 4242" value={newCardDetails.number} onChange={e => setNewCardDetails(prev => ({ ...prev, number: e.target.value }))} className="form-input" style={{ padding: '10px', fontSize: '13px', width: '100%' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Expiry Date (MM/YY)</label>
                      <input type="text" required placeholder="12/28" value={newCardDetails.exp} onChange={e => setNewCardDetails(prev => ({ ...prev, exp: e.target.value }))} className="form-input" style={{ padding: '10px', fontSize: '13px', width: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '13px', width: '100%' }}>Save Payment Card</button>
                    </div>
                  </div>
                </form>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                {cards.map(c => (
                  <div key={c.id} style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', borderRadius: '12px', border: '1px solid var(--border-color)', position: 'relative' }}>
                    <button onClick={() => handleRemoveCard(c.id)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>{c.type}</span>
                    <h4 style={{ fontSize: '16px', fontFamily: 'monospace', letterSpacing: '2px', margin: '12px 0 8px' }}>•••• {c.last4}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>{c.holder}</span>
                      <span>Expires {c.exp}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Feature 15: Aura Wallet & UPI Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ padding: '20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>👛 Aura Cash Wallet Balance</span>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>₹{walletBalance.toLocaleString('en-IN')}</span>
                  </div>
                  <button 
                    onClick={() => setShowWalletForm(!showWalletForm)} 
                    className="btn-primary" 
                    style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700 }}
                  >
                    {showWalletForm ? 'Cancel' : '+ Add Money'}
                  </button>
                </div>

                {/* Interactive Recharge Form */}
                {showWalletForm && (
                  <form onSubmit={handleRechargeWalletSubmit} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Enter Amount to Add to Wallet</h4>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input 
                        type="number" required placeholder="Enter amount in ₹" 
                        value={rechargeAmount} 
                        onChange={(e) => setRechargeAmount(e.target.value)}
                        className="form-input" style={{ padding: '10px 14px', fontSize: '15px', fontWeight: 700, flex: 1 }} 
                      />
                      <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 700 }}>
                        Add Money Now
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Quick Add:</span>
                      {['100', '500', '1000', '2000'].map(amt => (
                        <button 
                          key={amt} type="button" 
                          onClick={() => setRechargeAmount(amt)}
                          className="btn-secondary" 
                          style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '12px', background: rechargeAmount === amt ? 'var(--primary)' : 'transparent', color: rechargeAmount === amt ? '#fff' : 'var(--text-main)' }}
                        >
                          +₹{amt}
                        </button>
                      ))}
                    </div>
                  </form>
                )}

                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Saved UPI ID</h3>
                  <div style={{ display: 'flex', gap: '12px', maxWidth: '400px' }}>
                    <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} className="form-input" style={{ padding: '10px 14px', fontSize: '14px', flex: 1 }} />
                    <button onClick={() => addToast('UPI ID saved!', 'success')} className="btn-secondary" style={{ padding: '10px 16px', fontSize: '13px' }}>Save</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PRIVACY & ACCOUNT CONTROLS */}
          {activeTab === 'privacy' && (
            <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>shield</span> {t('privacyData')}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Feature 16-18: Data package export, cache clear, account deactivation</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Feature 16: Download Account JSON */}
                <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>Download Account Data Package</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Export profile, addresses and wallet records to JSON file</span>
                  </div>
                  <button onClick={handleDownloadData} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700 }}>Download JSON</button>
                </div>

                {/* Feature 17: Clear Search History & Cookies */}
                <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>Clear Search History & Browsing Cache</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Wipe recently viewed products and local search history</span>
                  </div>
                  <button onClick={() => { localStorage.removeItem('recently_viewed'); addToast('Cache cleared!', 'info') }} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>Clear Cache</button>
                </div>

                {/* Feature 18: Account Deactivation */}
                <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444', display: 'block' }}>Delete Account</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Permanently delete your AuraShop account and all associated data</span>
                  </div>
                  <button onClick={() => alert('Account deletion request registered.')} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Delete Account</button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default Settings
