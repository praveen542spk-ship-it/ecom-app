/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect } from 'react'
import { useAuth } from './AuthContext'

const CartContext = createContext()

function cartReducer(state, action) {
  switch (action.type) {
    case 'LOAD_CART': {
      return { 
        ...state, 
        items: action.payload.items, 
        coupon: action.payload.coupon, 
        discountRate: action.payload.discountRate 
      }
    }
    case 'ADD_ITEM': {
      const exists = state.items.find(item => item.id === action.payload.id)
      let newItems
      if (exists) {
        newItems = state.items.map(item =>
          item.id === action.payload.id ? { ...item, quantity: (item.quantity || 1) + 1 } : item
        )
      } else {
        newItems = [...state.items, { ...action.payload, quantity: 1 }]
      }
      return { ...state, items: newItems }
    }
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload)
      return { ...state, items: newItems }
    }
    case 'INCREMENT_ITEM': {
      const newItems = state.items.map(item =>
        item.id === action.payload ? { ...item, quantity: (item.quantity || 1) + 1 } : item
      )
      return { ...state, items: newItems }
    }
    case 'DECREMENT_ITEM': {
      const newItems = state.items.map(item => {
        if (item.id === action.payload) {
          const newQty = (item.quantity || 1) - 1
          return newQty > 0 ? { ...item, quantity: newQty } : null
        }
        return item
      }).filter(Boolean)
      return { ...state, items: newItems }
    }
    case 'APPLY_COUPON': {
      if (action.payload && typeof action.payload === 'object') {
        return { 
          ...state, 
          coupon: action.payload.code.toUpperCase(), 
          discountRate: Number(action.payload.discountRate) 
        }
      }
      let rate = 0
      const code = action.payload.toUpperCase()
      if (code === 'SAVE10') rate = 0.10
      else if (code === 'SAVE20') rate = 0.20
      else if (code === 'AURADEAL') rate = 0.30
      
      return { ...state, coupon: code, discountRate: rate }
    }
    case 'CLEAR_CART': {
      return { ...state, items: [], coupon: null, discountRate: 0 }
    }
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const { user } = useAuth()
  const storageSuffix = user?.email || 'guest'

  const [state, dispatch] = useReducer(cartReducer, null, () => {
    return {
      items: JSON.parse(localStorage.getItem(`cart_items_${storageSuffix}`)) || [],
      coupon: JSON.parse(localStorage.getItem(`cart_coupon_${storageSuffix}`)) || null,
      discountRate: JSON.parse(localStorage.getItem(`cart_discount_rate_${storageSuffix}`)) || 0
    }
  })

  // Re-sync and merge when user logs in/out
  useEffect(() => {
    const newItems = JSON.parse(localStorage.getItem(`cart_items_${storageSuffix}`)) || []
    const newCoupon = JSON.parse(localStorage.getItem(`cart_coupon_${storageSuffix}`)) || null
    const newDiscountRate = JSON.parse(localStorage.getItem(`cart_discount_rate_${storageSuffix}`)) || 0

    // If user logged in, merge guest cart into user cart
    if (storageSuffix !== 'guest') {
      const guestItems = JSON.parse(localStorage.getItem(`cart_items_guest`)) || []
      if (guestItems.length > 0) {
        guestItems.forEach(guestItem => {
          const existing = newItems.find(i => i.id === guestItem.id)
          if (existing) {
            existing.quantity = (existing.quantity || 1) + (guestItem.quantity || 1)
          } else {
            newItems.push(guestItem)
          }
        })
        // Wipe guest cart after merge
        localStorage.removeItem('cart_items_guest')
        localStorage.removeItem('cart_coupon_guest')
        localStorage.removeItem('cart_discount_rate_guest')
      }
    }

    dispatch({ 
      type: 'LOAD_CART', 
      payload: { items: newItems, coupon: newCoupon, discountRate: newDiscountRate } 
    })
  }, [storageSuffix])

  // Persist changes to the current user's local storage
  useEffect(() => {
    localStorage.setItem(`cart_items_${storageSuffix}`, JSON.stringify(state.items))
    localStorage.setItem(`cart_coupon_${storageSuffix}`, JSON.stringify(state.coupon))
    localStorage.setItem(`cart_discount_rate_${storageSuffix}`, JSON.stringify(state.discountRate))
  }, [state, storageSuffix])

  return (
    <CartContext.Provider value={{ 
      cart: state.items, 
      coupon: state.coupon, 
      discountRate: state.discountRate, 
      dispatch 
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}