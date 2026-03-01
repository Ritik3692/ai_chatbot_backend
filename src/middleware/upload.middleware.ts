import multer from 'multer';
import { ApiError } from '../utils/ApiError';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['application/pdf'];

/** Memory storage — file buffer is accessible as req.file.buffer for Cloudinary streaming upload */
const storage = multer.memoryStorage();

const fileFilter = (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new ApiError(400, 'Only PDF files are allowed'));
    }
};

export const uploadMiddleware = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
        files: 1,
    },
});

/** Single-file PDF upload field handler */
export const uploadPDF = uploadMiddleware.single('pdf');
