/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      removeToast(id)
    }, 3000)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 9999,
        maxWidth: '350px',
        width: 'calc(100% - 48px)'
      }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="glass-panel"
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: 'var(--shadow-lg)',
              animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              borderLeft: `4px solid ${
                toast.type === 'success' ? '#10b981' : 
                toast.type === 'error' ? '#ef4444' : '#6366f1'
              }`,
              background: 'var(--bg-surface)'
            }}
          >
            <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}>
              {toast.type === 'success' ? '✨' : toast.type === 'error' ? '💥' : '📢'}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-main)', flex: 1 }}>
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
