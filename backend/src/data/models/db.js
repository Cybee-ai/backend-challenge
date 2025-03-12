import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI

async function connectDB() {
  try {
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000, // ⏳ Wait max 5 sec for MongoDB
      });
      
      console.log('Connected to MongoDB using Mongoose');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
}


export default connectDB;
