import { Pinecone } from '@pinecone-database/pinecone';
import { logger } from '../utils/logger';

let pineconeClient: Pinecone | null = null;

export const getPineconeClient = (): Pinecone => {
    if (!pineconeClient) {
        const apiKey = process.env.PINECONE_API_KEY;
        if (!apiKey) throw new Error('PINECONE_API_KEY is not defined in environment variables');
        pineconeClient = new Pinecone({ apiKey });
    }
    return pineconeClient;
};

export const getPineconeIndex = () => {
    let indexName = process.env.PINECONE_INDEX_NAME;
    if (!indexName) throw new Error('PINECONE_INDEX_NAME is not defined in environment variables');

    // If it's a URL, extract the index name
    if (indexName.startsWith('https://')) {
        const host = indexName.replace('https://', '');
        const firstPart = host.split('.')[0];
        // Strip the random suffix (e.g. -h9wqv8r) which is usually the last hyphenated part
        // if it looks like a hash (alphanumeric, around 7-10 chars)
        indexName = firstPart.replace(/-[a-z0-9]{7,12}$/, '');
        logger.info(`Extracted Pinecone index name: ${indexName} from host: ${host}`);
    }

    return getPineconeClient().index(indexName);
};
