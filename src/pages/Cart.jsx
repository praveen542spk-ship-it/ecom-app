import { useCart } from '../services/CartContext'

function Cart() {
  const { cart, dispatch } = useCart()

  if (cart.length === 0) return <h2 style={{ padding: '20px' }}>Cart is empty!</h2>

  return (
    <div style={{ padding: '20px' }}>
      <h1>Cart ({cart.length} items)</h1>
      {cart.map(item => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #ddd', padding: '12px 0' }}>
          <img src={item.image} alt={item.title} style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px' }}>{item.title}</p>
            <p style={{ color: 'green', fontWeight: 'bold' }}>${item.price}</p>
          </div>
          <button
            onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: item.id })}
            style={{ padding: '6px 12px', background: 'red', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Remove
          </button>
        </div>
      ))}
      <button
        onClick={() => dispatch({ type: 'CLEAR_CART' })}
        style={{ marginTop: '16px', padding: '10px 20px', background: '#222', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
        Clear Cart
      </button>
    </div>
  )
}

export default Cart