#!/usr/bin/env node
/**
 * Admin script to approve a pending user
 * Usage: bun run scripts/admin-approve-user.js <user-id>
 *
 * Requires bun runtime (uses mongoose from node_modules)
 */

const mongoose = require('mongoose');

// Database configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'erp-miniproject';

async function approveUser(userId) {
  try {
    // Connect to MongoDB
    const mongoUri = `${MONGODB_URI}/${DB_NAME}`;
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Create User model dynamically (avoiding TypeScript compilation issues)
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema);

    // Find the user
    const user = await User.findById(userId);

    if (!user) {
      console.error(`✗ User not found: ${userId}`);
      console.log('\nTo list all users, run:');
      console.log('  bun run scripts/admin-list-users.js');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('\nUser Found:');
    console.log('  Name:', user.name);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Current Status:', user.status);

    if (user.status === 'active' || user.status === 'approved') {
      console.log('\n✗ User is already approved/active');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Approve the user
    const result = await User.updateOne(
      { _id: userId },
      {
        status: 'active',
        approvedAt: new Date(),
        approvedBy: userId // Self-approval for initial setup
      }
    );

    if (result.modifiedCount > 0) {
      const updatedUser = await User.findById(userId);
      console.log('\n✓ User approved successfully!');
      console.log('  New Status:', updatedUser.status);
      console.log('  Approved At:', updatedUser.approvedAt.toISOString());
    } else {
      console.log('\n✗ No changes made');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

// Get user ID from command line
const userId = process.argv[2];

if (!userId) {
  console.error('Usage: bun run scripts/admin-approve-user.js <user-id>');
  console.error('\nExample: bun run scripts/admin-approve-user.js 69d4f12e55a851bad53e5504');
  process.exit(1);
}

approveUser(userId);
