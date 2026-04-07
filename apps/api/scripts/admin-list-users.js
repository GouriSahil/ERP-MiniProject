#!/usr/bin/env node
/**
 * Admin script to list all users
 * Usage: bun run scripts/admin-list-users.js
 *
 * Requires bun runtime
 */

const mongoose = require('mongoose');

// Database configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'erp-miniproject';

async function listUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = `${MONGODB_URI}/${DB_NAME}`;
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    // Create User model dynamically
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema);

    // Get all users
    const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 });

    console.log(`Total Users: ${users.length}\n`);

    if (users.length === 0) {
      console.log('No users found.');
    } else {
      console.log('ID                                   | Name              | Email                | Role     | Status');
      console.log(''.padEnd(90, '-'));

      users.forEach(user => {
        const id = user._id.toString();
        const shortId = id.substring(0, 37) + '...';
        console.log(
          `${shortId} | ${user.name.padEnd(17)} | ${user.email.padEnd(20)} | ${user.role.padEnd(8)} | ${user.status}`
        );
      });
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

listUsers();
