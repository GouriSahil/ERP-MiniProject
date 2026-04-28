const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/erp-miniproject').then(async () => {
    const db = mongoose.connection.db;
    const count = await db.collection('courseofferings').countDocuments();
    const count2 = await db.collection('courses').countDocuments();
    const count3 = await db.collection('course_offerings').countDocuments();
    console.log("courseofferings collection count:", count);
    console.log("courses collection count:", count2);
    console.log("course_offerings collection count:", count3);
    process.exit(0);
});
