const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/erp-miniproject').then(async () => {
    const db = mongoose.connection.db;
    const count = await db.collection('courseofferings').countDocuments();
    const count2 = await db.collection('courses').countDocuments();
    const count3 = await db.collection('course_offerings').countDocuments();
    console.log("courseofferings collection count:", count);
    console.log("courses collection count:", count2);
    console.log("course_offerings collection count:", count3);
    
    if (count > 0) {
        const docs = await db.collection('courseofferings').find().limit(1).toArray();
        console.log(docs);
    } else if (count3 > 0) {
        const docs = await db.collection('course_offerings').find().limit(1).toArray();
        console.log(docs);
    }
    
    process.exit(0);
});
