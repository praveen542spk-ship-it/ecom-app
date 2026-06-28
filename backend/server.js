import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Stripe from 'stripe'
import dotenv from 'dotenv'
import nodemailer from 'nodemailer'
import mongoose from 'mongoose'
import dns from 'dns'

dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '1.1.1.1'])

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, 'db.json')

const app = express()
app.use(cors())
app.use(express.json())

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey) : null

if (!stripe) {
  console.log('⚠️ Stripe Secret Key missing in .env. Running payment server in MOCK mode.')
} else {
  console.log('✅ Stripe Integration initialized in TEST mode.')
}

// Nodemailer Email Config
const emailUser = process.env.EMAIL_USER
const emailPass = process.env.EMAIL_PASS
const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com'
const emailPort = Number(process.env.EMAIL_PORT) || 587
const notifyEmail = process.env.NOTIFICATION_EMAIL // Recipient email address

const transporter = (emailUser && emailPass) ? nodemailer.createTransport({
  host: emailHost,
  port: emailPort,
  secure: emailPort === 465, // true for 465, false for other ports
  auth: {
    user: emailUser,
    pass: emailPass
  }
}) : null

if (!transporter) {
  console.log('⚠️ Email SMTP credentials (EMAIL_USER & EMAIL_PASS) missing in .env. Email notifications are disabled.')
} else {
  console.log('✅ Email Notification service initialized.')
}

// Local JSON Database Helpers
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8')
    const parsed = JSON.parse(data)
    
    if (!parsed.users) parsed.users = []
    if (!parsed.orders) parsed.orders = []
    if (!parsed.wishlists) parsed.wishlists = []
    if (!parsed.reviews) parsed.reviews = []
    if (!parsed.products) parsed.products = []
    
    let dbChanged = false
    
    if (!parsed.coupons) {
      parsed.coupons = [
        { code: 'SAVE10', discountRate: 0.10 },
        { code: 'SAVE20', discountRate: 0.20 },
        { code: 'AURADEAL', discountRate: 0.30 }
      ]
      dbChanged = true
    }
    
    if (!parsed.config) {
      parsed.config = {
        upiId: process.env.UPI_ID || '6374060801@ibl',
        stripeEnabled: !!stripe,
        notifyEmail: process.env.NOTIFICATION_EMAIL || 'praveen542spk@gmail.com'
      }
      dbChanged = true
    }
    
    if (!parsed.logs) {
      parsed.logs = [
        { id: `log_${Date.now()}`, type: 'system', message: 'Admin backoffice initialized.', date: new Date().toLocaleString() }
      ]
      dbChanged = true
    }
    
    if (dbChanged) {
      fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf8')
    }
    
    return parsed
  } catch (err) {
    console.error('Error reading database:', err)
    return { 
      users: [], 
      orders: [], 
      wishlists: [], 
      reviews: [], 
      products: [], 
      coupons: [
        { code: 'SAVE10', discountRate: 0.10 },
        { code: 'SAVE20', discountRate: 0.20 },
        { code: 'AURADEAL', discountRate: 0.30 }
      ],
      config: {
        upiId: '6374060801@ibl',
        stripeEnabled: false,
        notifyEmail: 'praveen542spk@gmail.com'
      },
      logs: []
    }
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8')
  } catch (err) {
    console.error('Error writing to database:', err)
  }
}

// --- MongoDB Schemas & Connection Configuration ---
let useMongoDB = false

const AddressSchema = new mongoose.Schema({
  id: String,
  name: String,
  address: String,
  city: String,
  zip: String,
  phone: String
})

const UserSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  email: { type: String, unique: true },
  password: { type: String },
  phone: String,
  avatar: String,
  token: String,
  addresses: [AddressSchema]
})

const ProductSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  title: String,
  price: Number,
  description: String,
  category: String,
  image: String,
  stock: Number,
  rating: {
    rate: Number,
    count: Number
  }
})

const OrderSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  sessionId: String,
  userId: String,
  amount: Number,
  items: Array,
  shippingAddress: Object,
  status: String,
  paymentMethod: String,
  upiTransactionId: String,
  date: String
})

const ReviewSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  productId: Number,
  userName: String,
  userEmail: String,
  rating: Number,
  comment: String,
  date: String
})

const WishlistSchema = new mongoose.Schema({
  userId: String,
  productId: Number
})

const CouponSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  discountRate: Number
})

const LogSchema = new mongoose.Schema({
  id: String,
  type: String,
  message: String,
  date: String
})

const ConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'system_config', unique: true },
  upiId: String,
  stripeEnabled: Boolean,
  notifyEmail: String
})

const User = mongoose.model('User', UserSchema)
const Product = mongoose.model('Product', ProductSchema)
const Order = mongoose.model('Order', OrderSchema)
const Review = mongoose.model('Review', ReviewSchema)
const Wishlist = mongoose.model('Wishlist', WishlistSchema)
const Coupon = mongoose.model('Coupon', CouponSchema)
const Log = mongoose.model('Log', LogSchema)
const Config = mongoose.model('Config', ConfigSchema)

// Auto-seeding logic from db.json to MongoDB Atlas
async function seedMongoDB() {
  try {
    const dbData = readDB()
    
    if (dbData.products && dbData.products.length > 0) {
      await Product.deleteMany({})
      await Product.insertMany(dbData.products)
      console.log(`🌱 Database Seed: Synced and updated ${dbData.products.length} products in MongoDB.`)
    }
    
    const userCount = await User.countDocuments()
    if (userCount === 0 && dbData.users && dbData.users.length > 0) {
      await User.insertMany(dbData.users)
      console.log(`🌱 Database Seed: Copied ${dbData.users.length} users to MongoDB.`)
    }
    
    const couponCount = await Coupon.countDocuments()
    if (couponCount === 0 && dbData.coupons && dbData.coupons.length > 0) {
      await Coupon.insertMany(dbData.coupons)
      console.log(`🌱 Database Seed: Copied ${dbData.coupons.length} coupons to MongoDB.`)
    }
    
    const orderCount = await Order.countDocuments()
    if (orderCount === 0 && dbData.orders && dbData.orders.length > 0) {
      await Order.insertMany(dbData.orders)
      console.log(`🌱 Database Seed: Copied ${dbData.orders.length} orders to MongoDB.`)
    }
    
    const reviewCount = await Review.countDocuments()
    if (reviewCount === 0 && dbData.reviews && dbData.reviews.length > 0) {
      await Review.insertMany(dbData.reviews)
      console.log(`🌱 Database Seed: Copied ${dbData.reviews.length} reviews to MongoDB.`)
    }
    
    const wishlistCount = await Wishlist.countDocuments()
    if (wishlistCount === 0 && dbData.wishlists && dbData.wishlists.length > 0) {
      await Wishlist.insertMany(dbData.wishlists)
      console.log(`🌱 Database Seed: Copied ${dbData.wishlists.length} wishlist entries to MongoDB.`)
    }
    
    const logCount = await Log.countDocuments()
    if (logCount === 0 && dbData.logs && dbData.logs.length > 0) {
      await Log.insertMany(dbData.logs)
      console.log(`🌱 Database Seed: Copied ${dbData.logs.length} system logs to MongoDB.`)
    }

    const configCount = await Config.countDocuments()
    if (configCount === 0 && dbData.config) {
      const newConfig = new Config({
        key: 'system_config',
        upiId: dbData.config.upiId || '6374060801@ibl',
        stripeEnabled: dbData.config.stripeEnabled || false,
        notifyEmail: dbData.config.notifyEmail || 'praveen542spk@gmail.com'
      })
      await newConfig.save()
      console.log(`🌱 Database Seed: Saved system configurations to MongoDB.`)
    }
  } catch (err) {
    console.error('⚠️ Database Seeding error:', err)
  }
}

// Connect to MongoDB
if (process.env.MONGODB_URI) {
  console.log('🔄 Connecting to MongoDB Atlas...')
  
  const connectWithRetry = async (retries = 5, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
      try {
        await mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 5000
        })
        console.log('✅ Connected to MongoDB Atlas.')
        useMongoDB = true
        await seedMongoDB()
        return
      } catch (err) {
        console.error(`⚠️ MongoDB Connection failed (Attempt ${i + 1}/${retries}). Retrying in ${delay/1000}s...`)
        if (i === retries - 1) {
          console.error('❌ MongoDB Connection failed permanently after retries. Falling back to db.json local file mode.')
        } else {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
  }
  
  await connectWithRetry()
} else {
  console.log('ℹ️ MONGODB_URI missing in .env. Running database in local JSON mode (db.json).')
}

// --- DB Abstract Wrapper Layer ---
const DB = {
  users: {
    find: async () => useMongoDB ? await User.find({}) : readDB().users,
    findOne: async (query) => {
      if (useMongoDB) {
        return await User.findOne(query)
      } else {
        const users = readDB().users
        return users.find(u => Object.keys(query).every(k => u[k] === query[k])) || null
      }
    },
    save: async (user) => {
      if (useMongoDB) {
        const existing = await User.findOne({ id: user.id })
        if (existing) {
          Object.assign(existing, user)
          return await existing.save()
        } else {
          const newUser = new User(user)
          return await newUser.save()
        }
      } else {
        const dbData = readDB()
        const idx = dbData.users.findIndex(u => u.id === user.id)
        if (idx > -1) {
          dbData.users[idx] = user
        } else {
          dbData.users.push(user)
        }
        writeDB(dbData)
        return user
      }
    }
  },
  products: {
    find: async () => useMongoDB ? await Product.find({}) : readDB().products,
    findOne: async (query) => {
      if (useMongoDB) {
        return await Product.findOne(query)
      } else {
        const products = readDB().products
        return products.find(p => Object.keys(query).every(k => p[k] === query[k])) || null
      }
    },
    save: async (product) => {
      if (useMongoDB) {
        const existing = await Product.findOne({ id: product.id })
        if (existing) {
          Object.assign(existing, product)
          return await existing.save()
        } else {
          const newProduct = new Product(product)
          return await newProduct.save()
        }
      } else {
        const dbData = readDB()
        const idx = dbData.products.findIndex(p => p.id === product.id)
        if (idx > -1) {
          dbData.products[idx] = product
        } else {
          dbData.products.push(product)
        }
        writeDB(dbData)
        return product
      }
    },
    delete: async (id) => {
      if (useMongoDB) {
        return await Product.deleteOne({ id })
      } else {
        const dbData = readDB()
        dbData.products = dbData.products.filter(p => p.id !== id)
        writeDB(dbData)
      }
    }
  },
  orders: {
    find: async (query = {}) => {
      if (useMongoDB) {
        return await Order.find(query)
      } else {
        const orders = readDB().orders
        return orders.filter(o => Object.keys(query).every(k => o[k] === query[k]))
      }
    },
    findOne: async (query) => {
      if (useMongoDB) {
        return await Order.findOne(query)
      } else {
        const orders = readDB().orders
        return orders.find(o => Object.keys(query).every(k => o[k] === query[k])) || null
      }
    },
    save: async (order) => {
      if (useMongoDB) {
        const existing = await Order.findOne({ id: order.id })
        if (existing) {
          Object.assign(existing, order)
          return await existing.save()
        } else {
          const newOrder = new Order(order)
          return await newOrder.save()
        }
      } else {
        const dbData = readDB()
        const idx = dbData.orders.findIndex(o => o.id === order.id)
        if (idx > -1) {
          dbData.orders[idx] = order
        } else {
          dbData.orders.push(order)
        }
        writeDB(dbData)
        return order
      }
    }
  },
  reviews: {
    find: async (query = {}) => {
      if (useMongoDB) {
        return await Review.find(query)
      } else {
        const reviews = readDB().reviews || []
        return reviews.filter(r => Object.keys(query).every(k => r[k] === query[k]))
      }
    },
    save: async (review) => {
      if (useMongoDB) {
        const newReview = new Review(review)
        return await newReview.save()
      } else {
        const dbData = readDB()
        if (!dbData.reviews) dbData.reviews = []
        dbData.reviews.push(review)
        writeDB(dbData)
        return review
      }
    },
    delete: async (id) => {
      if (useMongoDB) {
        return await Review.deleteOne({ id })
      } else {
        const dbData = readDB()
        dbData.reviews = (dbData.reviews || []).filter(r => r.id !== id)
        writeDB(dbData)
      }
    }
  },
  wishlists: {
    find: async (query = {}) => {
      if (useMongoDB) {
        return await Wishlist.find(query)
      } else {
        const wishlists = readDB().wishlists || []
        return wishlists.filter(w => Object.keys(query).every(k => w[k] === query[k]))
      }
    },
    findOne: async (query) => {
      if (useMongoDB) {
        return await Wishlist.findOne(query)
      } else {
        const wishlists = readDB().wishlists || []
        return wishlists.find(w => Object.keys(query).every(k => w[k] === query[k])) || null
      }
    },
    toggle: async (userId, productId) => {
      if (useMongoDB) {
        const existing = await Wishlist.findOne({ userId, productId })
        if (existing) {
          await Wishlist.deleteOne({ userId, productId })
          return 'removed'
        } else {
          const entry = new Wishlist({ userId, productId })
          await entry.save()
          return 'added'
        }
      } else {
        const dbData = readDB()
        if (!dbData.wishlists) dbData.wishlists = []
        const idx = dbData.wishlists.findIndex(w => w.userId === userId && w.productId === productId)
        let action = 'added'
        if (idx > -1) {
          dbData.wishlists.splice(idx, 1)
          action = 'removed'
        } else {
          dbData.wishlists.push({ userId, productId })
        }
        writeDB(dbData)
        return action
      }
    }
  },
  coupons: {
    find: async () => useMongoDB ? await Coupon.find({}) : readDB().coupons || [],
    findOne: async (query) => {
      if (useMongoDB) {
        return await Coupon.findOne(query)
      } else {
        const coupons = readDB().coupons || []
        return coupons.find(c => Object.keys(query).every(k => c[k] === query[k])) || null
      }
    },
    save: async (coupon) => {
      if (useMongoDB) {
        const newCoupon = new Coupon(coupon)
        return await newCoupon.save()
      } else {
        const dbData = readDB()
        if (!dbData.coupons) dbData.coupons = []
        dbData.coupons.push(coupon)
        writeDB(dbData)
        return coupon
      }
    },
    delete: async (code) => {
      if (useMongoDB) {
        return await Coupon.deleteOne({ code })
      } else {
        const dbData = readDB()
        dbData.coupons = (dbData.coupons || []).filter(c => c.code !== code)
        writeDB(dbData)
      }
    }
  },
  config: {
    get: async () => {
      if (useMongoDB) {
        let conf = await Config.findOne({ key: 'system_config' })
        if (!conf) {
          conf = new Config({ key: 'system_config', upiId: '6374060801@ibl', stripeEnabled: false, notifyEmail: 'praveen542spk@gmail.com' })
          await conf.save()
        }
        return conf
      } else {
        return readDB().config
      }
    },
    save: async (configData) => {
      if (useMongoDB) {
        let conf = await Config.findOne({ key: 'system_config' })
        if (!conf) {
          conf = new Config({ key: 'system_config' })
        }
        Object.assign(conf, configData)
        return await conf.save()
      } else {
        const dbData = readDB()
        dbData.config = {
          upiId: configData.upiId || dbData.config.upiId,
          stripeEnabled: configData.stripeEnabled !== undefined ? configData.stripeEnabled : dbData.config.stripeEnabled,
          notifyEmail: configData.notifyEmail || dbData.config.notifyEmail
        }
        writeDB(dbData)
        return dbData.config
      }
    }
  },
  logs: {
    find: async () => useMongoDB ? await Log.find({}) : readDB().logs || [],
    save: async (logEntry) => {
      if (useMongoDB) {
        const newLog = new Log(logEntry)
        return await newLog.save()
      } else {
        const dbData = readDB()
        if (!dbData.logs) dbData.logs = []
        dbData.logs.push(logEntry)
        writeDB(dbData)
        return logEntry
      }
    }
  }
}

// Authentication Middleware
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(412).json({ error: 'Missing or malformed Authorization token.' })
  }
  const token = authHeader.split(' ')[1]
  const user = await DB.users.findOne({ token })
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' })
  }
  req.user = user
  next()
}

// Admin Authentication Middleware
function authenticateAdmin(req, res, next) {
  authenticate(req, res, () => {
    if (req.user.email !== 'praveen542spk@gmail.com') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' })
    }
    next()
  })
}

// --- API ENDPOINTS ---

// 1. Auth: Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' })
  }

  const exists = await DB.users.findOne({ email: email.toLowerCase() })
  if (exists) {
    return res.status(400).json({ error: 'Email already registered.' })
  }

  const newUser = {
    id: Date.now().toString(),
    name,
    email: email.toLowerCase(),
    password, // Plain text for local testing mockup simplicity
    token: `token_${Math.random().toString(36).substr(2)}`,
    addresses: []
  }

  await DB.users.save(newUser)
  await DB.logs.save({
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type: 'user',
    message: `New customer registered: ${newUser.name} (${newUser.email})`,
    date: new Date().toLocaleString()
  })

  res.status(201).json({
    token: newUser.token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, phone: newUser.phone || '', avatar: newUser.avatar || '' }
  })
})

// 2. Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  const user = await DB.users.findOne({ email: email.toLowerCase(), password })
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  // Refresh token on login
  user.token = `token_${Math.random().toString(36).substr(2)}`
  await DB.users.save(user)

  res.json({
    token: user.token,
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone || '', avatar: user.avatar || '' }
  })
})

// 3. Auth: Profile GET & PUT
app.get('/api/auth/profile', authenticate, async (req, res) => {
  res.json({
    user: { id: req.user.id, name: req.user.name, email: req.user.email, phone: req.user.phone || '', avatar: req.user.avatar || '' }
  })
})

app.put('/api/auth/profile', authenticate, async (req, res) => {
  const { name, email, phone, avatar } = req.body
  const user = req.user

  if (name) user.name = name
  if (email) user.email = email.toLowerCase()
  if (phone !== undefined) user.phone = phone
  if (avatar !== undefined) user.avatar = avatar

  await DB.users.save(user)

  res.json({
    message: 'Profile updated successfully',
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone || '', avatar: user.avatar || '' }
  })
})

// 4. Products: List (with dynamically updated ratings)
app.get('/api/products', async (req, res) => {
  const products = await DB.products.find()
  const reviews = await DB.reviews.find()
  
  // Calculate average ratings from the reviews table dynamically
  const productsWithRatings = products.map(product => {
    const prodObj = product.toObject ? product.toObject() : { ...product }
    const productReviews = reviews.filter(r => Number(r.productId) === Number(prodObj.id))
    if (productReviews.length > 0) {
      const totalRate = productReviews.reduce((sum, r) => sum + r.rating, 0)
      const avgRate = Number((totalRate / productReviews.length).toFixed(1))
      return {
        ...prodObj,
        rating: { rate: avgRate, count: productReviews.length }
      }
    }
    return prodObj
  })

  res.json(productsWithRatings)
})

// 5. Products: Single Item Detail & Reviews
app.get('/api/products/:id', async (req, res) => {
  const id = Number(req.params.id)
  const product = await DB.products.findOne({ id })
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' })
  }

  const reviews = await DB.reviews.find({ productId: id })
  res.json({ product, reviews })
})

// 6. Products: Submit review
app.post('/api/products/:id/reviews', authenticate, async (req, res) => {
  const productId = Number(req.params.id)
  const { rating, comment } = req.body

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' })
  }

  const product = await DB.products.findOne({ id: productId })
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' })
  }

  const newReview = {
    id: Date.now().toString(),
    productId,
    userName: req.user.name,
    userEmail: req.user.email,
    rating: Number(rating),
    comment: comment || '',
    date: new Date().toLocaleDateString()
  }

  await DB.reviews.save(newReview)

  res.status(201).json(newReview)
})

// 7. Wishlist: Get items
app.get('/api/wishlist', authenticate, async (req, res) => {
  const userWishlistEntries = await DB.wishlists.find({ userId: req.user.id })
  const userWishlistIds = userWishlistEntries.map(w => w.productId)
  
  const products = await DB.products.find()
  const wishlistProducts = products.filter(p => userWishlistIds.includes(p.id))
  res.json(wishlistProducts)
})

// 8. Wishlist: Toggle Add/Remove
app.post('/api/wishlist/toggle', authenticate, async (req, res) => {
  const { productId } = req.body
  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required.' })
  }

  const action = await DB.wishlists.toggle(req.user.id, Number(productId))
  res.json({ action, productId: Number(productId) })
})

// 9. Orders: Get active user history
app.get('/api/orders', authenticate, async (req, res) => {
  const userOrders = await DB.orders.find({ userId: req.user.id })
  res.json(userOrders)
})

// 10. Stripe: Create checkout session
app.post('/api/payment/create-checkout-session', async (req, res) => {
  const { cartItems, userId, couponCode, discountRate } = req.body
  
  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ error: 'Cannot checkout an empty cart.' })
  }

  const successUrl = `http://localhost:5173/checkout-success?session_id={CHECKOUT_SESSION_ID}&userId=${userId || 'guest'}`
  const cancelUrl = `http://localhost:5173/cart`

  // MOCK MODE FALLBACK
  if (!stripe) {
    const mockSessionId = `mock_sess_${Math.random().toString(36).substr(2, 9)}`
    const mockRedirectUrl = `http://localhost:5173/checkout-success?session_id=${mockSessionId}&userId=${userId || 'guest'}&mock=true`
    return res.json({ url: mockRedirectUrl })
  }

  try {
    // Format cart items into Stripe line items format
    const lineItems = cartItems.map(item => {
      // Apply coupon discount rate directly to the product unit price for checkout clarity
      const discountedPrice = Math.round(item.price * (1 - (discountRate || 0)) * 100)
      
      return {
        price_data: {
          currency: 'inr',
          product_data: {
            name: item.title,
            images: [item.image],
            description: item.description.substring(0, 100) + '...'
          },
          unit_amount: discountedPrice > 0 ? discountedPrice : 100 // Minimum 1 rupee (100 paise)
        },
        quantity: item.quantity || 1
      }
    })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId || 'guest',
        couponCode: couponCode || 'none',
        discountRate: (discountRate || 0).toString()
      }
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('Error creating Stripe session:', err)
    res.status(500).json({ error: 'Failed to initiate Stripe transaction.' })
  }
})

// 11. Stripe: Verify session and write order to db
app.post('/api/payment/verify-session', async (req, res) => {
  const { sessionId, userId, mock, cartItems, shippingAddress } = req.body
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required.' })
  }

  const exists = await DB.orders.findOne({ sessionId })
  if (exists) {
    return res.json({ order: exists, status: 'already_processed' })
  }

  let finalAmount
  let lineItems

  if (mock === 'true' || mock === true || !stripe) {
    // Construct mock order
    lineItems = (cartItems || []).map(item => ({
      title: item.title,
      price: item.price,
      quantity: item.quantity || 1,
      image: item.image || '',
      image_filter: item.image_filter || 'none'
    }))
    const subtotal = lineItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0)
    finalAmount = Number((subtotal * 1.08).toFixed(2)) // Add mock tax
  } else {
    // Retrieve actual Stripe Checkout session details
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      if (session.payment_status !== 'paid') {
        return res.status(400).json({ error: 'Transaction has not been paid.' })
      }
      finalAmount = session.amount_total / 100
      
      // Pull line items details from Stripe
      const stripeLineItems = await stripe.checkout.sessions.listLineItems(sessionId)
      lineItems = stripeLineItems.data.map(item => ({
        title: item.description,
        price: item.amount_total / 100 / item.quantity,
        quantity: item.quantity
      }))
    } catch (err) {
      console.error('Error retrieving Stripe session:', err)
      return res.status(500).json({ error: 'Failed to verify payment session.' })
    }
  }

  const newOrder = {
    id: `AUR-ORD-${Math.floor(100000 + Math.random() * 900000)}`,
    sessionId,
    userId: userId || 'guest',
    amount: finalAmount,
    items: lineItems,
    shippingAddress: shippingAddress || null,
    status: 'Processing', // Processing -> Shipped -> Delivered
    date: new Date().toLocaleDateString()
  }

  // Decrement product stock count
  const allProducts = await DB.products.find()
  for (const item of lineItems) {
    const product = allProducts.find(p => p.title === item.title || item.title.startsWith(p.title))
    if (product) {
      product.stock = Math.max(0, (product.stock || 0) - (item.quantity || 1))
      await DB.products.save(product)
    }
  }

  await DB.orders.save(newOrder)
  await DB.logs.save({
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type: 'order',
    message: `New Stripe order placed: ${newOrder.id} for ₹${newOrder.amount.toFixed(2)}`,
    date: new Date().toLocaleString()
  })

  // Trigger order notifications
  sendOrderNotification(newOrder)

  res.status(201).json({ order: newOrder, status: 'new' })
})

// Helper: Send Real-Time Notifications (Terminal log + Discord Webhook)
async function sendOrderNotification(order) {
  const paymentMethodText = order.paymentMethod === 'upi' 
    ? `UPI Code (${order.upiTransactionId || 'N/A'})` 
    : order.paymentMethod === 'card'
      ? `Credit/Debit Card (${order.upiTransactionId || 'N/A'})`
      : order.paymentMethod === 'netbank'
        ? `Net Banking (${order.upiTransactionId || 'N/A'})`
        : order.paymentMethod === 'cod' 
          ? 'Cash on Delivery (COD)' 
          : 'Online Stripe Checkout'

  // 1. Colored Terminal Alert
  console.log(`\n🚨 ==========================================`)
  console.log(`🚨 [NEW ORDER RECEIVED] Reference: ${order.id}`)
  console.log(`   Customer Name: ${order.shippingAddress ? order.shippingAddress.name : 'Unknown'}`)
  console.log(`   Amount: ₹${order.amount.toFixed(2)}`)
  console.log(`   Payment Method: ${paymentMethodText}`)
  console.log(`   Address: ${order.shippingAddress ? `${order.shippingAddress.address}, ${order.shippingAddress.city} - ${order.shippingAddress.zip}` : 'None'}`)
  console.log(`   Items: ${order.items.map(item => `${item.title} (x${item.quantity})`).join(', ')}`)
  console.log(`🚨 ==========================================\n`)

  // 2. Discord Webhook Notify
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (webhookUrl) {
    try {
      const itemsDescription = order.items.map(item => `- **${item.title}** (x${item.quantity})`).join('\n')
      const addressStr = order.shippingAddress 
        ? `${order.shippingAddress.name}\n${order.shippingAddress.address}\n${order.shippingAddress.city} - ${order.shippingAddress.zip}\n📞 Phone: ${order.shippingAddress.phone || 'N/A'}`
        : 'No shipping address provided.'

      const payload = {
        content: '🚨 **AuraShop Alert: New Order Placed!**',
        embeds: [
          {
            title: `Order Reference: ${order.id}`,
            color: 16750848, // Gold / Orange
            fields: [
              { name: 'Paid Amount', value: `₹${order.amount.toFixed(2)}`, inline: true },
              { name: 'Payment Method', value: paymentMethodText, inline: true },
              { name: 'Order Status', value: order.status, inline: true },
              { name: 'Date', value: order.date, inline: true },
              { name: 'Delivery Address', value: addressStr, inline: false },
              { name: 'Items Ordered', value: itemsDescription, inline: false }
            ],
            timestamp: new Date().toISOString()
          }
        ]
      }

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (err) {
      console.error('Error sending Discord Webhook notification:', err)
    }
  }

  // 3. Email Notification Notify
  if (transporter && notifyEmail) {
    try {
      const itemsText = order.items.map(item => `- ${item.title} (x${item.quantity}) - ₹${item.price.toFixed(2)}`).join('\n')
      const addressText = order.shippingAddress 
        ? `${order.shippingAddress.name}\n${order.shippingAddress.address}\n${order.shippingAddress.city} - ${order.shippingAddress.zip}\nPhone: ${order.shippingAddress.phone || 'N/A'}`
        : 'No shipping address provided.'

      const mailOptions = {
        from: `"AuraShop Alerts" <${emailUser}>`,
        to: notifyEmail,
        subject: `🚨 New AuraShop Order Received - ${order.id}`,
        text: `New order confirmed!\n\nOrder Reference: ${order.id}\nPaid Amount: ₹${order.amount.toFixed(2)}\nPayment Method: ${paymentMethodText}\nDate: ${order.date}\n\nShipping Details:\n${addressText}\n\nItems Ordered:\n${itemsText}\n\nManage this order inside your admin panel.`
      }

      await transporter.sendMail(mailOptions)
      console.log(`📩 Notification email sent successfully to ${notifyEmail}`)
    } catch (err) {
      console.error('Error sending order notification email:', err)
    }
  }
}

// 12. Addresses: Get saved addresses for the active user
app.get('/api/addresses', authenticate, async (req, res) => {
  const user = await DB.users.findOne({ id: req.user.id })
  if (!user) {
    return res.status(404).json({ error: 'User not found.' })
  }
  res.json(user.addresses || [])
})

// 13. Addresses: Add a saved address
app.post('/api/addresses', authenticate, async (req, res) => {
  const { name, address, city, zip, phone } = req.body
  if (!name || !address || !city || !zip) {
    return res.status(400).json({ error: 'Name, address, city, and zip are required.' })
  }

  const user = await DB.users.findOne({ id: req.user.id })
  if (!user) {
    return res.status(404).json({ error: 'User not found.' })
  }

  if (!user.addresses) {
    user.addresses = []
  }

  const newAddress = {
    id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name,
    address,
    city,
    zip,
    phone: phone || ''
  }

  user.addresses.push(newAddress)
  await DB.users.save(user)

  res.status(201).json(newAddress)
})

// 14. Addresses: Delete a saved address
app.delete('/api/addresses/:id', authenticate, async (req, res) => {
  const addrId = req.params.id
  const user = await DB.users.findOne({ id: req.user.id })
  if (!user) {
    return res.status(404).json({ error: 'User not found.' })
  }

  if (!user.addresses) {
    user.addresses = []
  }

  const idx = user.addresses.findIndex(a => a.id === addrId)
  if (idx > -1) {
    user.addresses.splice(idx, 1)
    await DB.users.save(user)
    res.json({ success: true })
  } else {
    res.status(404).json({ error: 'Address not found.' })
  }
})

// 14.5. Config: Get payment configurations
app.get('/api/config', async (req, res) => {
  const systemConfig = await DB.config.get()
  res.json({
    upiId: systemConfig.upiId || '6374060801@ibl',
    stripeEnabled: systemConfig.stripeEnabled || false
  })
})

// 15. Payment: Place Direct Order (Cash on Delivery / UPI QR Code)
app.post('/api/payment/create-direct-order', authenticate, async (req, res) => {
  const { orderId, cartItems, shippingAddress, discountRate, paymentMethod, transactionId } = req.body
  
  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ error: 'Cannot checkout an empty cart.' })
  }

  // Calculate cost
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0)
  const discount = subtotal * (discountRate || 0)
  const shipping = subtotal >= 1000 || subtotal === 0 ? 0 : 99.00
  const tax = (subtotal - discount) * 0.08
  const totalAmount = Number((subtotal - discount + shipping + tax).toFixed(2))

  const isUpi = paymentMethod === 'upi'
  const isCard = paymentMethod === 'card'
  const isNetbank = paymentMethod === 'netbank'
  const finalOrderId = orderId || `AUR-ORD-${Math.floor(100000 + Math.random() * 900000)}`

  const newOrder = {
    id: finalOrderId,
    sessionId: isUpi 
      ? `upi_${transactionId || Math.random().toString(36).substr(2, 9)}` 
      : isCard
        ? `card_${transactionId || Math.random().toString(36).substr(2, 9)}`
        : isNetbank
          ? `net_${transactionId || Math.random().toString(36).substr(2, 9)}`
          : `cod_${Math.random().toString(36).substr(2, 9)}`,
    userId: req.user.id,
    amount: totalAmount,
    items: cartItems.map(item => ({
      title: item.title,
      price: item.price,
      quantity: item.quantity || 1,
      image: item.image || '',
      image_filter: item.image_filter || 'none'
    })),
    shippingAddress: shippingAddress || null,
    status: 'Processing',
    paymentMethod: paymentMethod || 'cod',
    upiTransactionId: (isUpi || isCard || isNetbank) ? transactionId : null,
    date: new Date().toLocaleDateString()
  }

  // Decrement product stock count
  for (const item of cartItems) {
    const product = await DB.products.findOne({ id: Number(item.id) })
    if (product) {
      product.stock = Math.max(0, (product.stock || 0) - (item.quantity || 1))
      await DB.products.save(product)
    }
  }

  await DB.orders.save(newOrder)
  await DB.logs.save({
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type: 'order',
    message: `New ${newOrder.paymentMethod.toUpperCase()} order placed: ${newOrder.id} for ₹${newOrder.amount.toFixed(2)}`,
    date: new Date().toLocaleString()
  })

  // Send real-time terminal & webhook notification
  sendOrderNotification(newOrder)

  res.status(201).json({ order: newOrder, success: true })
})

// Public: Get Active Coupons
app.get('/api/coupons', async (req, res) => {
  const coupons = await DB.coupons.find()
  res.json(coupons || [])
})

// 16. Admin: Add New Product
app.post('/api/admin/products', authenticateAdmin, async (req, res) => {
  const { title, price, description, category, image, stock } = req.body
  if (!title || !price || !description || !category || !image) {
    return res.status(400).json({ error: 'All product fields are required.' })
  }

  const products = await DB.products.find()
  const newProduct = {
    id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
    title,
    price: Number(price),
    description,
    category,
    image,
    stock: stock !== undefined ? Number(stock) : 10,
    rating: { rate: 5.0, count: 1 }
  }

  await DB.products.save(newProduct)
  await DB.logs.save({
    id: `log_${Date.now()}`,
    type: 'product',
    message: `Product added to catalog: ${title} (Stock: ${newProduct.stock})`,
    date: new Date().toLocaleString()
  })

  res.status(201).json(newProduct)
})

// 17. Admin: Update Product
app.put('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const { title, price, description, category, image, stock } = req.body

  if (!title || !price || !description || !category || !image) {
    return res.status(400).json({ error: 'All product fields are required.' })
  }

  const product = await DB.products.findOne({ id })
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' })
  }

  product.title = title
  product.price = Number(price)
  product.description = description
  product.category = category
  product.image = image
  product.stock = stock !== undefined ? Number(stock) : product.stock

  await DB.products.save(product)

  await DB.logs.save({
    id: `log_${Date.now()}`,
    type: 'product',
    message: `Product updated: ${title} (Price: ₹${price}, Stock: ${stock})`,
    date: new Date().toLocaleString()
  })

  res.json(product)
})

// 18. Admin: Delete Product
app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const product = await DB.products.findOne({ id })
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' })
  }

  await DB.products.delete(id)
  await DB.logs.save({
    id: `log_${Date.now()}`,
    type: 'product',
    message: `Product deleted from catalog: ${product.title}`,
    date: new Date().toLocaleString()
  })

  res.json({ success: true, message: 'Product deleted.' })
})

// 19. Admin: Get Orders List
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
  const orders = await DB.orders.find()
  res.json(orders || [])
})

// 20. Admin: Update Order Status
app.put('/api/admin/orders/:id/status', authenticateAdmin, async (req, res) => {
  const orderId = req.params.id
  const { status } = req.body
  if (!['Processing', 'Shipped', 'Delivered'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' })
  }

  const order = await DB.orders.findOne({ id: orderId })
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' })
  }

  const oldStatus = order.status
  order.status = status
  await DB.orders.save(order)

  await DB.logs.save({
    id: `log_${Date.now()}`,
    type: 'order',
    message: `Order ${orderId} status changed from "${oldStatus}" to "${status}"`,
    date: new Date().toLocaleString()
  })

  res.json(order)
})

// 21. Admin: Get Registered Users Stats
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  const users = await DB.users.find()
  const orders = await DB.orders.find()
  const usersStats = users.map(user => {
    const userOrders = orders.filter(o => o.userId === user.id)
    const totalSpent = userOrders.reduce((sum, o) => sum + o.amount, 0)
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      orderCount: userOrders.length,
      totalSpent: Number(totalSpent.toFixed(2))
    }
  })
  res.json(usersStats)
})

// 22. Admin: Get Coupons List
app.get('/api/admin/coupons', authenticateAdmin, async (req, res) => {
  const coupons = await DB.coupons.find()
  res.json(coupons || [])
})

// 23. Admin: Add Promo Coupon
app.post('/api/admin/coupons', authenticateAdmin, async (req, res) => {
  const { code, discountRate } = req.body
  if (!code || discountRate === undefined) {
    return res.status(400).json({ error: 'Coupon code and discount rate are required.' })
  }

  const upperCode = code.toUpperCase().trim()
  const coupons = await DB.coupons.find()
  if (coupons.find(c => c.code === upperCode)) {
    return res.status(400).json({ error: 'Coupon code already exists.' })
  }

  const newCoupon = {
    code: upperCode,
    discountRate: Number(discountRate)
  }

  await DB.coupons.save(newCoupon)
  await DB.logs.save({
    id: `log_${Date.now()}`,
    type: 'coupon',
    message: `New coupon code added: ${upperCode} (${Number(discountRate) * 100}% off)`,
    date: new Date().toLocaleString()
  })

  res.status(201).json(newCoupon)
})

// 24. Admin: Delete Promo Coupon
app.delete('/api/admin/coupons/:code', authenticateAdmin, async (req, res) => {
  const code = req.params.code.toUpperCase().trim()
  const exists = await DB.coupons.findOne({ code })
  if (!exists) {
    return res.status(404).json({ error: 'Coupon not found.' })
  }

  await DB.coupons.delete(code)
  await DB.logs.save({
    id: `log_${Date.now()}`,
    type: 'coupon',
    message: `Coupon code deleted: ${code}`,
    date: new Date().toLocaleString()
  })

  res.json({ success: true })
})

// 24.5 Admin: Get Reviews List
app.get('/api/admin/reviews', authenticateAdmin, async (req, res) => {
  const reviews = await DB.reviews.find()
  res.json(reviews || [])
})

// 25. Admin: Delete Review
app.delete('/api/admin/reviews/:id', authenticateAdmin, async (req, res) => {
  const id = req.params.id
  const reviews = await DB.reviews.find()
  const review = reviews.find(r => r.id === id)
  if (!review) {
    return res.status(404).json({ error: 'Review not found.' })
  }

  await DB.reviews.delete(id)
  await DB.logs.save({
    id: `log_${Date.now()}`,
    type: 'review',
    message: `Deleted review from ${review.userName} on product ID: ${review.productId}`,
    date: new Date().toLocaleString()
  })

  res.json({ success: true })
})

// 26. Admin: Update Live Config Configs
app.put('/api/admin/config', authenticateAdmin, async (req, res) => {
  const { upiId, stripeEnabled, notifyEmail } = req.body
  const systemConfig = await DB.config.get()

  const updatedConfig = {
    upiId: upiId || systemConfig.upiId,
    stripeEnabled: stripeEnabled !== undefined ? stripeEnabled : systemConfig.stripeEnabled,
    notifyEmail: notifyEmail || systemConfig.notifyEmail
  }

  await DB.config.save(updatedConfig)

  await DB.logs.save({
    id: `log_${Date.now()}`,
    type: 'system',
    message: 'System configuration updated.',
    date: new Date().toLocaleString()
  })

  res.json(updatedConfig)
})

// 27. Admin: Get Backoffice Stats
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  const orders = await DB.orders.find()
  const products = await DB.products.find()
  const users = await DB.users.find()
  const logs = await DB.logs.find()

  const totalSales = orders.reduce((sum, o) => sum + o.amount, 0)
  const outOfStockCount = products.filter(p => p.stock !== undefined && p.stock <= 0).length
  const lowStockCount = products.filter(p => p.stock !== undefined && p.stock > 0 && p.stock <= 3).length

  // Category stats
  const categoryStats = {}
  products.forEach(p => {
    if (p.category) {
      categoryStats[p.category] = (categoryStats[p.category] || 0) + 1
    }
  })

  // Product sales counts
  const productSales = {}
  orders.forEach(order => {
    order.items.forEach(item => {
      productSales[item.title] = (productSales[item.title] || 0) + (item.quantity || 1)
    })
  })

  const topSellingProducts = Object.keys(productSales).map(title => ({
    title,
    salesCount: productSales[title]
  })).sort((a, b) => b.salesCount - a.salesCount).slice(0, 5)

  const recentUsers = users.slice(-5).map(u => ({ id: u.id, name: u.name, email: u.email }))
  const systemConfig = await DB.config.get()

  res.json({
    totalSales: Number(totalSales.toFixed(2)),
    totalOrders: orders.length,
    outOfStockCount,
    lowStockCount,
    totalUsers: users.length,
    categoryStats,
    topSellingProducts,
    recentUsers,
    config: systemConfig || {},
    recentLogs: logs.slice(-20).reverse()
  })
})

// Server Spin-up
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 AuraShop Full-Stack API Server listening on port ${PORT}`)
})
