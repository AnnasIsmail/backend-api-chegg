
const db = process.env.DB;
const mongoose = require("mongoose");

mongoose.connect(
    "mongodb+srv://chegg-permission:chegg123@serverlessinstance0.jc8bmep.mongodb.net/test",{
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10 
      }
);

// try {
//     mongoose.connect('mongodb://chegg-permission:chegg123@serverlessinstance0.jc8bmep.mongodb.net/test', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     });
//     console.log('Connected to MongoDB');
// } catch (error) {
//     console.error('Error connecting to MongoDB', error);
//     process.exit(1); // Keluar dari proses jika tidak bisa terhubung
// }