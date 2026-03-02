import OpenAI, { AzureOpenAI } from 'openai';

let defaultClient: OpenAI | AzureOpenAI | null = null;
let chatClient: AzureOpenAI | null = null;

export const getOpenAIClient = (type: 'default' | 'chat' = 'default'): OpenAI | AzureOpenAI => {
    const azureKey = process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;

    if (type === 'chat' && azureKey && azureEndpoint) {
        if (!chatClient) {
            const azureChatVersion = process.env.AZURE_OPENAI_CHAT_API_VERSION ?? process.env.AZURE_OPENAI_API_VERSION ?? '2024-02-01';
            chatClient = new AzureOpenAI({
                apiKey: azureKey,
                endpoint: azureEndpoint,
                apiVersion: azureChatVersion,
            });
        }
        return chatClient;
    }

    if (!defaultClient) {
        if (azureKey && azureEndpoint) {
            const azureVersion = process.env.AZURE_OPENAI_API_VERSION ?? '2024-02-01';
            defaultClient = new AzureOpenAI({
                apiKey: azureKey,
                endpoint: azureEndpoint,
                apiVersion: azureVersion,
            });
        } else {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) throw new Error('Neither AZURE_OPENAI nor OPENAI_API_KEY is defined');
            defaultClient = new OpenAI({ apiKey });
        }
    }
    return defaultClient;
};
