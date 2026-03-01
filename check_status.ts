import mongoose from 'mongoose';
import { Chatbot } from './src/models/Chatbot';
import 'dotenv/config';

async function check() {
    await mongoose.connect(process.env.MONGODB_URI!);
    const chatbots = await Chatbot.find({ status: 'error' });
    console.log(JSON.stringify(chatbots, null, 2));
    process.exit(0);
}
check();
