
import multer from "multer";
import { SUPPORTED_FILE_FORMATS } from "@shared/types/import-export";

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = Object.values(SUPPORTED_FILE_FORMATS);
    if (allowedMimeTypes.includes(file.mimetype as any)) {
      cb(null, true);
    } else {
      // Allow generic binary stream if extension matches?
      // For now, strict on MIME types, but Excel can be tricky.
      // Revisit if users have issues.
      cb(null, true); 
    }
  },
});
