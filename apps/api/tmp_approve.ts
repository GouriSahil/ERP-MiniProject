import mongoose from 'mongoose';

async function approveAll() {
  try {
    await mongoose.connect('mongodb://localhost:27017/erp-miniproject');
    console.log('Connected to MongoDB');
    
    // Bypass the schema validation and update directly
    const result = await mongoose.connection.collection('users').updateMany(
      {},
      { $set: { status: 'active' } }
    );
    
    console.log(`Success! Updated ${result.modifiedCount} user(s) to 'active' status.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

approveAll();
