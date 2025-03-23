// 1. Install required packages
// npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/lib-storage multer

// Required imports for AWS SDK v3
const { S3Client, PutObjectCommand, GetObjectCommand,
    ListObjectsV2Command, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
    }
});

// Create user storage folder on S3 when a new user registers
const createUserFolder = async (userId) => {
    const bucketName = process.env.AWS_BUCKET_NAME;
    try {
        // Create a folder (object with key ending in '/')
        const folderUpload = new Upload({
            client: s3Client,
            params: {
                Bucket: bucketName,
                Key: `users/${userId}/`,
                Body: ''
            }
        });
        await folderUpload.done();

        // Initialize user storage metadata
        const metadataUpload = new Upload({
            client: s3Client,
            params: {
                Bucket: bucketName,
                Key: `users/${userId}/.metadata.json`,
                Body: JSON.stringify({
                    totalStorageUsed: 0,
                    storageLimit: 1024 * 1024 * 1024, // 1GB in bytes
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                }),
                ContentType: 'application/json'
            }
        });
        await metadataUpload.done();

        return true;
    } catch (error) {
        console.error(`Error creating user folder: ${error.message}`);
        return false;
    }
};

// Get current user storage usage
const getUserStorageInfo = async (userId) => {
    const bucketName = process.env.AWS_BUCKET_NAME;

    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: `users/${userId}/.metadata.json`
        });

        const response = await s3Client.send(command);

        // Read and parse the stream
        const bodyContents = await streamToString(response.Body);
        return JSON.parse(bodyContents);
    } catch (error) {
        console.error(`Error getting user storage info: ${error.message}`);
        return null;
    }
};

// Helper function to convert stream to string
const streamToString = async (stream) => {
    const chunks = [];

    for await (const chunk of stream) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks).toString('utf-8');
};

// Update user storage usage after file upload
const updateUserStorageUsage = async (userId, additionalBytes) => {
    const bucketName = process.env.AWS_BUCKET_NAME;

    try {
        // Get current metadata
        const currentMetadata = await getUserStorageInfo(userId);

        if (!currentMetadata) {
            throw new Error('User metadata not found');
        }

        // Update storage usage
        const updatedMetadata = {
            ...currentMetadata,
            totalStorageUsed: currentMetadata.totalStorageUsed + additionalBytes,
            lastUpdated: new Date().toISOString()
        };

        // Save updated metadata using Upload
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: bucketName,
                Key: `users/${userId}/.metadata.json`,
                Body: JSON.stringify(updatedMetadata),
                ContentType: 'application/json'
            }
        });

        await upload.done();
        return updatedMetadata;
    } catch (error) {
        console.error(`Error updating user storage: ${error.message}`);
        return null;
    }
};

// Check if user has enough storage space available
const hasEnoughStorageSpace = async (userId, fileSize) => {
    const storageInfo = await getUserStorageInfo(userId);

    if (!storageInfo) {
        return false;
    }

    const availableSpace = storageInfo.storageLimit - storageInfo.totalStorageUsed;
    return fileSize <= availableSpace;
};

// Upload file to S3 using multipart upload with lib-storage
const uploadFileToS3 = async (userId, file) => {
    const bucketName = process.env.AWS_BUCKET_NAME;
    const fileName = `${Date.now()}-${file.originalname}`;
    const fileKey = `users/${userId}/${fileName}`;

    try {
        // Check if user has enough storage
        const hasSpace = await hasEnoughStorageSpace(userId, file.size);
        if (!hasSpace) {
            throw new Error('Storage quota exceeded');
        }

        // Create a readable stream from the file buffer
        const fileStream = fs.createReadStream(file.path);

        // Create multipart upload using Upload from lib-storage
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: bucketName,
                Key: fileKey,
                Body: fileStream,
                ContentType: file.mimetype,
                ACL: 'private',
                Metadata: {
                    originalName: file.originalname,
                    userId: userId
                }
            }
        });

        // Upload with progress tracking if needed
        upload.on('httpUploadProgress', (progress) => {
            console.log(`Upload progress: ${progress.loaded}/${progress.total}`);
        });

        // Complete the upload
        await upload.done();

        // Update user storage metadata
        await updateUserStorageUsage(userId, file.size);

        return {
            key: fileKey,
            name: fileName,
            size: file.size,
            type: file.mimetype
        };
    } catch (error) {
        console.error(`Error uploading file: ${error.message}`);
        throw error;
    }
};

// Configure multer for local disk storage (temporary before S3 upload)
const multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: multerStorage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB per file limit
});

// List files in user directory
const listUserFiles = async (userId) => {
    const bucketName = process.env.AWS_BUCKET_NAME;

    try {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: `users/${userId}/`,
            StartAfter: `users/${userId}/.metadata.json`
        });

        const data = await s3Client.send(command);

        return data.Contents
            .filter(item => !item.Key.endsWith('/') && !item.Key.includes('.metadata.json'))
            .map(item => ({
                key: item.Key,
                name: item.Key.split('/').pop(),
                size: item.Size,
                lastModified: item.LastModified
            }));
    } catch (error) {
        console.error(`Error listing files: ${error.message}`);
        return [];
    }
};

// Get file size before deletion
const getFileSize = async (fileKey) => {
    const bucketName = process.env.AWS_BUCKET_NAME;

    try {
        const command = new HeadObjectCommand({
            Bucket: bucketName,
            Key: fileKey
        });

        const data = await s3Client.send(command);
        return data.ContentLength;
    } catch (error) {
        console.error(`Error getting file size: ${error.message}`);
        return 0;
    }
};

// Delete a file
const deleteFile = async (userId, fileKey) => {
    const bucketName = process.env.AWS_BUCKET_NAME;

    try {
        // Get file size before deletion to update storage usage
        const fileSize = await getFileSize(fileKey);

        // Delete the file
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: fileKey
        });

        await s3Client.send(command);

        // Update storage metadata by subtracting the file size
        if (fileSize > 0) {
            await updateUserStorageUsage(userId, -fileSize);
        }

        return true;
    } catch (error) {
        console.error(`Error deleting file: ${error.message}`);
        return false;
    }
};

// Generate presigned URL for secure file access
const getFileDownloadUrl = async (fileKey) => {
    const bucketName = process.env.AWS_BUCKET_NAME;

    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileKey
        });

        // URL expires in 1 hour
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (error) {
        console.error(`Error generating presigned URL: ${error.message}`);
        return null;
    }
};

module.exports = {
    createUserFolder,
    getUserStorageInfo,
    updateUserStorageUsage,
    hasEnoughStorageSpace,
    upload,
    uploadFileToS3,
    listUserFiles,
    getFileSize,
    deleteFile,
    getFileDownloadUrl
};