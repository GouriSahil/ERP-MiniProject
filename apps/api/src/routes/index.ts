import express from 'express';

const router = express.Router();

// Import routes
// import authRoutes from './auth.routes';
// import productRoutes from './product.routes';
// import orderRoutes from './order.routes';

// API routes
// router.use('/auth', authRoutes);
// router.use('/products', productRoutes);
// router.use('/orders', orderRoutes);

// Sample route
router.get('/', (req, res) => {
  res.json({
    message: 'ERP API v1.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
    }
  });
});

export default router;
