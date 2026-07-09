import {
    PutObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import { r2 } from "../../config/r2";

import { v4 as uuid } from "uuid";

const bucket = process.env.R2_BUCKET!;

export class StorageService {

    static async upload(file: Express.Multer.File) {

        const extension = file.originalname.split(".").pop();

        const filename =
            `${uuid()}.${extension}`;

        await r2.send(
            new PutObjectCommand({
                Bucket: bucket,

                Key: filename,

                Body: file.buffer,

                ContentType: file.mimetype,
            })
        );

        return {
            key: filename,

            url:
                `${process.env.R2_PUBLIC_URL}/${filename}`,
        };
    }

    static async delete(key: string) {

        await r2.send(
            new DeleteObjectCommand({

                Bucket: bucket,

                Key: key,
            })
        );
    }
}