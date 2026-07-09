import { Request, Response } from "express";

import { StorageService } from "../services/images/storage.service";

export const uploadMedia = async (
    req: Request,
    res: Response
) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded",
            });
        }

        const result =
            await StorageService.upload(req.file);

        return res.json(result);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Upload failed",
        });
    }
};