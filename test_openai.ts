import OpenAI from 'openai';
import 'dotenv/config';

async function testOpenAI() {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: 'Test message',
        });
        console.log('OpenAI OK');
    } catch (err) {
        console.error('OpenAI Error:', (err as any).message);
    }
    process.exit(0);
}
testOpenAI();
