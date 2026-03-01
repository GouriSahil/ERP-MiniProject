import mongoose from 'mongoose';

const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://erp_user:erp_password@localhost:27017/erp_db?authSource=erp_db';

    const options = {
      autoIndex: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(mongoUri, options);

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
};

export { connectDatabase };
