import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

async function testDownload() {
    const publicId = 'chatbot-pdfs/69a41cc56830b0ca96ab4f71/1772362959011-JavaScript_Interview_Questions_and_Answers';
    try {
        // Just try to get asset info
        const result = await cloudinary.api.resource(publicId, { resource_type: 'image' });
        console.log('Resource Info OK:', result.secure_url);
    } catch (err) {
        console.error('Resource Info Error:', (err as any).message);
    }
    process.exit(0);
}
testDownload();
