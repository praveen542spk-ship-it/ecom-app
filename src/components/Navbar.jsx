import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <nav style={{ display: 'flex', gap: '20px', padding: '16px', background: '#222', color: 'white' }}>
      <Link to='/' style={{ color: 'white', textDecoration: 'none' }}>Home</Link>
      <Link to='/products' style={{ color: 'white', textDecoration: 'none' }}>Products</Link>
      <Link to='/cart' style={{ color: 'white', textDecoration: 'none' }}>Cart</Link>
    </nav>
  )
}

export default Navbar