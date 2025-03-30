const client = require("../db");
const { loadFileSQL } = require("../utils/script");
const s3Controller = require("../controllers/s3UserStorageController");

module.exports.put_files = async (req, res) => {
    try {
        const userId = req.user.id;

        // Lấy metadata từ request body
        let metadataArray = [];
        try {
            metadataArray = JSON.parse(req.body.metadata || "[]");
            if (!Array.isArray(metadataArray)) {
                metadataArray = [metadataArray];
            }
        } catch (e) {
            return res.status(400).json({ message: "Invalid metadata format" });
        }

        // Kiểm tra có metadata không
        if (metadataArray.length === 0) {
            return res.status(400).json({ message: "No metadata provided" });
        }

        // Mảng lưu kết quả cập nhật
        const processedEntries = [];
        const failedEntries = [];
        const qrUpsertFile = loadFileSQL("updateFiles.sql");

        // Object lưu map giữa file name và file object
        const filesMap = {};

        // Nếu có files được upload, xây dựng map dựa trên originalname
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                filesMap[file.originalname] = file;
            });
        }

        // Xử lý từng metadata entry
        for (const metadata of metadataArray) {
            // Kiểm tra metadata hợp lệ
            if (!metadata || !metadata.id) {
                failedEntries.push({
                    metadata,
                    error: "Missing required field: id"
                });
                continue;
            }

            try {
                // Nếu là thư mục, chỉ cần cập nhật database
                if (metadata.isDir === true) {
                    try {
                        const result = await client.query(qrUpsertFile, [
                            metadata.id,
                            userId,
                            metadata.name,
                            true, // isDir = true
                            metadata.parentId || null,
                            '' // Path trống cho thư mục
                        ]);

                        processedEntries.push({
                            id: metadata.id,
                            name: metadata.name,
                            isDir: true,
                            parentId: metadata.parentId || null,
                            path: '',
                            type: 'folder'
                        });
                    } catch (dbError) {
                        console.error("Database error for folder:", dbError);
                        failedEntries.push({
                            metadata,
                            error: "Database update failed for folder"
                        });
                    }
                    continue;
                }

                // Nếu là file, cần kiểm tra xem có file thực tương ứng không
                const file = metadata.fileOriginalName ? filesMap[metadata.fileOriginalName] : null;

                // Nếu không có file thực, chỉ cập nhật metadata
                if (!file) {
                    try {
                        const result = await client.query(qrUpsertFile, [
                            metadata.id,
                            userId,
                            metadata.name,
                            false, // isDir = false
                            metadata.parentId || null,
                            metadata.path || '' // Giữ nguyên path nếu đã có
                        ]);

                        processedEntries.push({
                            id: metadata.id,
                            name: metadata.name,
                            isDir: false,
                            parentId: metadata.parentId || null,
                            path: metadata.path || '',
                            type: 'file (metadata only)'
                        });
                    } catch (dbError) {
                        console.error("Database error for file metadata:", dbError);
                        failedEntries.push({
                            metadata,
                            error: "Database update failed for file metadata"
                        });
                    }
                    continue;
                }

                // Nếu có file thực, upload lên S3 và cập nhật metadata
                try {
                    // Kiểm tra không gian lưu trữ trước khi upload
                    const hasSpace = await s3Controller.hasEnoughStorageSpace(userId, file.size);
                    if (!hasSpace) {
                        failedEntries.push({
                            metadata,
                            originalName: file.originalname,
                            error: "Storage quota exceeded"
                        });
                        continue;
                    }

                    // Upload file lên S3
                    const uploadResult = await s3Controller.uploadFileToS3(userId, file);

                    // Cập nhật thông tin file vào database với path từ S3
                    const result = await client.query(qrUpsertFile, [
                        metadata.id,
                        userId,
                        metadata.name || file.originalname,
                        false, // isDir = false
                        metadata.parentId || null,
                        uploadResult.key // Lưu đường dẫn S3 vào path
                    ]);

                    // Thêm vào danh sách đã xử lý thành công
                    processedEntries.push({
                        id: metadata.id,
                        name: metadata.name || file.originalname,
                        isDir: false,
                        parentId: metadata.parentId || null,
                        path: uploadResult.key,
                        s3Key: uploadResult.key,
                        size: uploadResult.size,
                        type: file.mimetype
                    });
                } catch (uploadError) {
                    console.error("Upload or database error:", uploadError);
                    failedEntries.push({
                        metadata,
                        originalName: file ? file.originalname : 'unknown',
                        error: uploadError.message || "Upload or database update failed"
                    });
                }
            } catch (error) {
                console.error("General processing error:", error);
                failedEntries.push({
                    metadata,
                    error: error.message || "General processing error"
                });
            }
        }

        // Trả về kết quả
        return res.status(200).json({
            message: processedEntries.length > 0
                ? failedEntries.length > 0
                    ? "Some entries were processed successfully"
                    : "All entries processed successfully"
                : "No entries were processed successfully",
            processedEntries,
            failedEntries,
            totalProcessed: processedEntries.length,
            totalFailed: failedEntries.length
        });

    } catch (error) {
        console.error("Server error in file update:", error);
        return res.status(500).json({ message: "Server error processing files" });
    }
};