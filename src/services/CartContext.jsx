import { createContext, useContext, useReducer } from 'react'

const CartContext = createContext()

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM':
      const exists = state.find(item => item.id === action.payload.id)
      if (exists) return state
      return [...state, action.payload]
    case 'REMOVE_ITEM':
      return state.filter(item => item.id !== action.payload)
    case 'CLEAR_CART':
      return []
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, [])
  return (
    <CartContext.Provider value={{ cart, dispatch }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}