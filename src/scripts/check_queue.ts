import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis';
import 'dotenv/config';

async function checkQueue() {
    try {
        const queue = new Queue('embedding', {
            connection: getRedisClient() as any
        });

        const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
        console.log('Queue Job Counts:', JSON.stringify(counts, null, 2));

        const waitingJobs = await queue.getJobs(['waiting'], 0, 10);
        console.log('Waiting Jobs (first 10):', JSON.stringify(waitingJobs.map(j => ({ id: j.id, data: j.data })), null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Failed to check queue:', error);
        process.exit(1);
    }
}

checkQueue();
