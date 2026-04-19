import mongoose from 'mongoose';

const URI = 'mongodb+srv://singhdhairyacs242551_db_user:Test%401234@cluster0.wx2ktca.mongodb.net/?appName=Cluster0';

console.log("Starting MongoDB Sandbox Test...");
mongoose.connect(URI, { serverSelectionTimeoutMS: 3000 })
  .then(() => {
    console.log("SUCCESS: Mongoose connected to Atlas successfully.");
    process.exit(0);
  })
  .catch(err => {
    console.error("FAILURE: Mongoose connection failed.");
    console.error(err.message);
    process.exit(1);
  });
