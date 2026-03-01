import { Pinecone } from '@pinecone-database/pinecone';
import 'dotenv/config';

async function testPinecone() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    try {
        const indexes = await pc.listIndexes();
        console.log('Available Indexes:', JSON.stringify(indexes, null, 2));
    } catch (err: any) {
        console.error('Pinecone Error:', err.message);
    }
    process.exit(0);
}
testPinecone();
