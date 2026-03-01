// MongoDB initialization script
// This script runs automatically when the container starts for the first time

db = db.getSiblingDB('erp_db');

// Create application user
db.createUser({
  user: 'erp_user',
  pwd: 'erp_password',
  roles: [
    {
      role: 'readWrite',
      db: 'erp_db'
    }
  ]
});

// Create initial collections and insert sample data
db.createCollection('users');
db.createCollection('products');
db.createCollection('orders');
db.createCollection('categories');

// Insert sample categories
db.categories.insertMany([
  { name: 'Electronics', description: 'Electronic devices and accessories', active: true, createdAt: new Date() },
  { name: 'Clothing', description: 'Apparel and fashion items', active: true, createdAt: new Date() },
  { name: 'Books', description: 'Books and publications', active: true, createdAt: new Date() }
]);

// Insert sample products
db.products.insertMany([
  {
    name: 'Laptop',
    description: 'High-performance laptop',
    price: 999.99,
    category: 'Electronics',
    stock: 50,
    active: true,
    createdAt: new Date()
  },
  {
    name: 'T-Shirt',
    description: 'Cotton t-shirt',
    price: 19.99,
    category: 'Clothing',
    stock: 200,
    active: true,
    createdAt: new Date()
  }
]);

print('MongoDB initialized successfully!');
print('Database: erp_db');
print('User: erp_user');
print('Collections: users, products, orders, categories');
