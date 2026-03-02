import { getOpenAIClient } from '../config/openai';
import 'dotenv/config';

async function testAzureOpenAI() {
    console.log('--- Testing Azure OpenAI Configuration ---');

    // 1. Test Embeddings
    const embeddingClient = getOpenAIClient('default');
    const embeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ?? process.env.AZURE_OPENAI_DEPLOYMENT ?? 'text-embedding-3-small';
    console.log(`Testing Embeddings with deployment: ${embeddingDeployment}...`);
    try {
        await embeddingClient.embeddings.create({
            model: embeddingDeployment,
            input: 'Test embedding message',
        });
        console.log('✅ Embedding deployment OK');
    } catch (err) {
        console.error('❌ Embedding Error:', (err as any).message);
    }

    // 2. Test Chat
    const chatClient = getOpenAIClient('chat');
    const chatDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-35-turbo';
    console.log(`Testing Chat with deployment: ${chatDeployment}...`);
    try {
        const response = await chatClient.chat.completions.create({
            model: chatDeployment,
            messages: [{ role: 'user', content: 'Say hello!' }],
            max_tokens: 10,
        });
        console.log('✅ Chat deployment OK. Response:', response.choices[0].message.content);
    } catch (err) {
        console.error('❌ Chat Error:', (err as any).message);
    }

    process.exit(0);
}

testAzureOpenAI();
