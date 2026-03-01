/**
 * DTO Layer — Upload
 * Validates file metadata after Multer processes the upload.
 */
import { z } from 'zod';

export const UploadPDFRequestDTO = z.object({
    chatbotId: z.string({ required_error: 'chatbotId is required' }).trim().min(1),
});
export type UploadPDFRequestDTO = z.infer<typeof UploadPDFRequestDTO>;

export interface UploadedFileMetaDTO {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    cloudinaryUrl: string;
    cloudinaryPublicId: string;
}

export interface UploadResponseDTO {
    chatbotId: string;
    file: UploadedFileMetaDTO;
    status: string; // 'queued' — embedding job submitted
    message: string;
}
