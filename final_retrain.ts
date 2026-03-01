import mongoose from 'mongoose';
import { Chatbot } from './src/models/Chatbot';
import { enqueueEmbeddingJob } from './src/jobs/embedding.queue';
import 'dotenv/config';

async function retrain() {
    await mongoose.connect(process.env.MONGODB_URI!);
    const id = '69a41cc56830b0ca96ab4f71';
    const chatbot = await Chatbot.findById(id);
    if (chatbot && chatbot.pdfUrl) {
        chatbot.status = 'training';
        await chatbot.save();
        await enqueueEmbeddingJob({
            chatbotId: id,
            pdfUrl: chatbot.pdfUrl,
            chatbotName: chatbot.name,
        });
        console.log('Retrain triggered');
    }
    process.exit(0);
}
retrain();
