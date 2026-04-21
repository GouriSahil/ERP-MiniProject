const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/erp-miniproject').then(async () => {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(collections.map(c => c.name));
    process.exit(0);
});
