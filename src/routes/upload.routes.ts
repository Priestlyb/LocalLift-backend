import { Router } from "express";

import { upload } from "../middleware/upload.middleware";

import { uploadMedia } from "../controllers/upload.controller";

const router = Router();

router.post(
    "/upload",
    upload.single("file"),
    uploadMedia
);

export default router;