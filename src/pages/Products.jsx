import { useState, useEffect } from 'react'
import { useCart } from '../services/CartContext'

function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const { dispatch } = useCart()

  useEffect(() => {
    fetch('https://fakestoreapi.com/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data)
        setLoading(false)
      })
  }, [])

  if (loading) return <h2 style={{ padding: '20px' }}>Loading products...</h2>

  return (
    <div style={{ padding: '20px' }}>
      <h1>Products</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '20px' }}>
        {products.map(product => (
          <div key={product.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px' }}>
            <img src={product.image} alt={product.title} loading='lazy'
              style={{ width: '100%', height: '200px', objectFit: 'contain' }} />
            <h3 style={{ fontSize: '14px', margin: '10px 0' }}>{product.title}</h3>
            <p style={{ color: 'green', fontWeight: 'bold' }}>${product.price}</p>
            <button
              onClick={() => dispatch({ type: 'ADD_ITEM', payload: product })}
              style={{ width: '100%', padding: '8px', background: '#222', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '8px' }}>
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Products