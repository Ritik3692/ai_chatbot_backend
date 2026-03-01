import mongoose from 'mongoose';
import { Chatbot } from './src/models/Chatbot';
import 'dotenv/config';

async function check() {
    await mongoose.connect(process.env.MONGODB_URI!);
    const chatbots = await Chatbot.find().sort({ updatedAt: -1 }).limit(5);
    console.log(JSON.stringify(chatbots.map(c => ({
        name: c.name,
        status: c.status,
        errorMessage: c.errorMessage,
        updatedAt: c.updatedAt
    })), null, 2));
    process.exit(0);
}
check();
