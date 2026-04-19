import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/User.js';

dotenv.config();

const clearUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.DB_URI);
        console.log('MongoDB Connected.');

        await User.deleteMany({});
        console.log('Successfully cleared the Users collection.');

        process.exit();
    } catch (error) {
        console.error('Error clearing users:', error);
        process.exit(1);
    }
};

clearUsers();
