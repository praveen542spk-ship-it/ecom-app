import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_URL } from '../services/AuthContext'
import ProductDetailModal from '../components/ProductDetailModal'

function Home() {
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  // 1. Sliding Hero Banner State
  const [currentSlide, setCurrentSlide] = useState(0)
  const slides = [
    {
      title: "Super Saver Tech Deals",
      desc: "Min 40% Off on wireless earbuds, smartwatches & mechanical keyboards.",
      cta: "Shop Electronics",
      path: "/products?category=electronics",
      color: "linear-gradient(135deg, #1e293b 0%, #312e81 100%)",
      image: "/hero_tech.png"
    },
    {
      title: "Sparkling Jewelry Festival",
      desc: "Up to 50% Off on solitaire rings, rose gold hoops & solid gold chains.",
      cta: "Shop Jewelry",
      path: "/products?category=jewelery",
      color: "linear-gradient(135deg, #1e293b 0%, #581c87 100%)",
      image: "/hero_jewelry.png"
    },
    {
      title: "Upgrade Your Wardrobe",
      desc: "Min 30% Off on classic linen shirts, summer dresses & leather jackets.",
      cta: "Shop Apparel",
      path: "/products?category=women's clothing",
      color: "linear-gradient(135deg, #1e293b 0%, #1e1b4b 100%)",
      image: "/hero_fashion.png"
    }
  ]

  // 2. Countdown Timer State (Deals of the day)
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 32, seconds: 45 })

  // Timer Countdown Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        } else {
          return { hours: 23, minutes: 59, seconds: 59 } // Reset to 24h
        }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-slide Hero Banners Effect
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length)
    }, 4500)
    return () => clearInterval(slideTimer)
  }, [slides.length])

  // Fetch products
  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => {
        setProducts(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  // Format countdown string
  const formatTime = (t) => {
    return `${t.hours.toString().padStart(2, '0')}:${t.minutes.toString().padStart(2, '0')}:${t.seconds.toString().padStart(2, '0')}`
  }

  // Categories list
  const categoriesList = [
    { value: 'all', label: 'All Offers', image: '/cat_all.png' },
    { value: 'electronics', label: 'Electronics', image: '/cat_electronics.png' },
    { value: 'jewelery', label: 'Jewelery', image: '/cat_jewelry.png' },
    { value: "men's clothing", label: "Men's Wear", image: '/cat_men.png' },
    { value: "women's clothing", label: "Women's Wear", image: '/cat_women.png' }
  ]

  // Filter products by category for scrolling rows
  const electronicsProducts = products.filter(p => p.category === 'electronics')
  const mensClothing = products.filter(p => p.category === "men's clothing")
  const womensClothing = products.filter(p => p.category === "women's clothing")

  return (
    <div className="flex flex-col gap-6 select-none">
      
      {/* 1. Category Navigation Strip */}
      <div className="flex justify-center bg-surface border-b border-theme py-3 gap-8 overflow-x-auto no-scrollbar fixed top-[70px] left-0 right-0 z-[900] px-4">
        {categoriesList.map((cat, idx) => (
          <div 
            key={idx} 
            onClick={() => navigate(cat.value === 'all' ? '/products' : `/products?category=${encodeURIComponent(cat.value)}`)}
            className="flex flex-col items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition-colors cursor-pointer whitespace-nowrap group"
          >
            <div className="w-10 h-10 rounded-full bg-white p-1 border border-theme flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              <img src={cat.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '50%' }} />
            </div>
            <span>{cat.label}</span>
          </div>
        ))}
      </div>

      <div className="app-container pt-[124px] flex flex-col gap-8">
        
        {/* 2. Hero Sliding Banner Carousel */}
        <section 
          className="relative h-[280px] rounded-xl text-white p-8 md:p-12 flex items-center justify-between overflow-hidden shadow-2xl border border-gray-800 transition-all"
          style={{ background: slides[currentSlide].color }}
        >
          {/* Background overlay accent */}
          <div className="absolute inset-0 bg-black/15 z-0" />
          
          <div className="flex flex-col gap-3 z-10 max-w-[65%]">
            <span className="text-[10px] tracking-wider bg-[#ec4899] text-white px-2 py-0.5 rounded w-fit font-bold uppercase">
              Aura Exclusive
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
              {slides[currentSlide].title}
            </h2>
            <p className="text-sm text-gray-200 leading-relaxed max-w-[500px]">
              {slides[currentSlide].desc}
            </p>
            <button 
              onClick={() => navigate(slides[currentSlide].path)}
              className="btn-primary self-start mt-2 px-5 py-2 font-bold text-xs"
            >
              {slides[currentSlide].cta} ➔
            </button>
          </div>

          <div style={{
            zIndex: 10,
            width: '220px',
            height: '220px',
            maxWidth: '35%',
            maxHeight: '220px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.4))'
          }}>
            <img 
              src={slides[currentSlide].image} 
              alt="" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain',
                mixBlendMode: 'screen'
              }} 
            />
          </div>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, idx) => (
              <button 
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2 h-2 rounded-full border-none cursor-pointer transition-colors ${
                  currentSlide === idx ? 'bg-[#ec4899]' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </section>

        {/* 3. Deals of the Day (Bento Grid Zone) */}
        <section className="glass-panel">
          <div className="flex flex-wrap items-center justify-between border-b border-theme pb-3.5 mb-5 gap-3">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold text-main">Deals of the Day</h3>
              <div className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded flex items-center gap-1.5 text-xs font-bold">
                <span className="material-symbols-outlined text-[14px]">alarm</span>
                <span>Ends in: {formatTime(timeLeft)}</span>
              </div>
            </div>
            
            <Link to="/products" className="text-xs text-primary font-bold hover:underline">
              View All Deals ➔
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-theme border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.slice(0, 4).map(product => (
                <div 
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-card border border-theme hover:border-primary rounded-xl p-3 cursor-pointer flex flex-col h-full hover:bg-input transition-all group"
                >
                  <div className="h-32 bg-white rounded-lg p-2 flex items-center justify-center mb-3 overflow-hidden">
                    <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" />
                  </div>
                  
                  <span className="bg-[#e11d48] text-white text-[9px] font-bold px-1.5 py-0.5 rounded self-start mb-2 uppercase">
                    SAVE 30%
                  </span>
                  
                  <h4 className="text-xs font-semibold text-main text-truncate-2 mb-2 group-hover:text-primary transition-colors leading-tight">
                    {product.title}
                  </h4>
                  
                  <div className="flex items-baseline gap-1.5 mt-auto pt-2 border-t border-theme">
                    <span className="font-bold text-sm text-[#10b981]">₹{product.price}</span>
                    <span className="text-[10px] text-muted line-through">₹{(product.price * 1.3).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. Scrolling Row: Best of Electronics */}
        <section className="glass-panel">
          <h3 className="text-base font-bold text-main border-b border-theme pb-3 mb-4">
            Best of Electronics
          </h3>
          <div className="carousel-row no-scrollbar">
            {electronicsProducts.map(product => (
              <div 
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="flex-[0_0_170px] bg-card border border-theme hover:border-primary rounded-xl p-3 cursor-pointer hover:bg-input transition-all group"
              >
                <div className="h-28 bg-white rounded-lg p-2 flex items-center justify-center mb-3 overflow-hidden">
                  <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" />
                </div>
                <h4 className="text-[11px] font-semibold text-main text-truncate-2 mb-1 group-hover:text-primary transition-colors leading-tight">
                  {product.title}
                </h4>
                <p className="font-bold text-xs text-[#10b981] mt-2">₹{product.price}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Scrolling Row: Men's Wear Deals */}
        <section className="glass-panel">
          <h3 className="text-base font-bold text-main border-b border-theme pb-3 mb-4">
            Men's Wear Deals
          </h3>
          <div className="carousel-row no-scrollbar">
            {mensClothing.map(product => (
              <div 
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="flex-[0_0_170px] bg-card border border-theme hover:border-primary rounded-xl p-3 cursor-pointer hover:bg-input transition-all group"
              >
                <div className="h-28 bg-white rounded-lg p-2 flex items-center justify-center mb-3 overflow-hidden">
                  <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" />
                </div>
                <h4 className="text-[11px] font-semibold text-main text-truncate-2 mb-1 group-hover:text-primary transition-colors leading-tight">
                  {product.title}
                </h4>
                <p className="font-bold text-xs text-[#10b981] mt-2">₹{product.price}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Scrolling Row: Women's Wear Deals */}
        <section className="glass-panel">
          <h3 className="text-base font-bold text-main border-b border-theme pb-3 mb-4">
            Women's Wear Deals
          </h3>
          <div className="carousel-row no-scrollbar">
            {womensClothing.map(product => (
              <div 
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="flex-[0_0_170px] bg-card border border-theme hover:border-primary rounded-xl p-3 cursor-pointer hover:bg-input transition-all group"
              >
                <div className="h-28 bg-white rounded-lg p-2 flex items-center justify-center mb-3 overflow-hidden">
                  <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" />
                </div>
                <h4 className="text-[11px] font-semibold text-main text-truncate-2 mb-1 group-hover:text-primary transition-colors leading-tight">
                  {product.title}
                </h4>
                <p className="font-bold text-xs text-[#10b981] mt-2">₹{product.price}</p>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  )
}

export default Home