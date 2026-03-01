import axios from 'axios';
import 'dotenv/config';

async function testDownload() {
    const pdfUrl = 'https://res.cloudinary.com/dfibialzd/image/upload/v1772362961/chatbot-pdfs/69a41cc56830b0ca96ab4f71/1772362959011-JavaScript_Interview_Questions_and_Answers.pdf';
    try {
        const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        console.log('Download OK. Size:', response.data.byteLength);
    } catch (err) {
        console.error('Download Error:', (err as any).message);
    }
    process.exit(0);
}
testDownload();
