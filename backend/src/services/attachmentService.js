const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const pool = require('../config/database');

class AttachmentService {
    constructor() {
        this.uploadDir = path.join(__dirname, '../../uploads/attachments');
        this.ensureUploadDirExists();
    }

    async ensureUploadDirExists() {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
        } catch (error) {
            console.error('Error creating upload directory:', error);
        }
    }

    /**
     * Save email attachment to disk and database
     * @param {Object} attachment - Parsed email attachment
     * @param {Number} messageId - Message ID from database
     * @param {Number} assignmentId - Assignment ID
     */
    async saveAttachment(attachment, messageId, assignmentId) {
        try {
            const originalFilename = attachment.filename || 'unnamed_file';
            const fileExtension = path.extname(originalFilename);
            const fileBaseName = path.basename(originalFilename, fileExtension);

            // Generate unique filename
            const timestamp = Date.now();
            const randomString = crypto.randomBytes(8).toString('hex');
            const savedFilename = `${fileBaseName}_${timestamp}_${randomString}${fileExtension}`;
            const filePath = path.join(this.uploadDir, savedFilename);

            // Save file to disk
            await fs.writeFile(filePath, attachment.content);

            const fileSize = attachment.size || attachment.content.length;
            const mimeType = attachment.contentType || 'application/octet-stream';

            // Save metadata to database
            const result = await pool.query(
                `INSERT INTO attachments (
          message_id, assignment_id, original_filename, 
          saved_filename, file_path, file_size, mime_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
                [messageId, assignmentId, originalFilename, savedFilename, filePath, fileSize, mimeType]
            );

            console.log(`✅ Saved attachment: ${originalFilename} (${this.formatFileSize(fileSize)})`);

            return result.rows[0];
        } catch (error) {
            console.error('Error saving attachment:', error);
            throw error;
        }
    }

    /**
     * Save multiple attachments
     */
    async saveAttachments(attachments, messageId, assignmentId) {
        const savedAttachments = [];

        for (const attachment of attachments) {
            try {
                const saved = await this.saveAttachment(attachment, messageId, assignmentId);
                savedAttachments.push(saved);
            } catch (error) {
                console.error(`Failed to save attachment ${attachment.filename}:`, error);
            }
        }

        return savedAttachments;
    }

    /**
     * Get attachments for a message
     */
    async getAttachmentsByMessageId(messageId) {
        try {
            const result = await pool.query(
                'SELECT * FROM attachments WHERE message_id = $1 ORDER BY created_at DESC',
                [messageId]
            );
            return result.rows;
        } catch (error) {
            console.error('Error fetching attachments:', error);
            return [];
        }
    }

    /**
     * Get all attachments for an assignment
     */
    async getAttachmentsByAssignmentId(assignmentId) {
        try {
            const result = await pool.query(
                'SELECT * FROM attachments WHERE assignment_id = $1 ORDER BY created_at DESC',
                [assignmentId]
            );
            return result.rows;
        } catch (error) {
            console.error('Error fetching attachments:', error);
            return [];
        }
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Delete attachment
     */
    async deleteAttachment(attachmentId) {
        try {
            // Get attachment info
            const result = await pool.query(
                'SELECT * FROM attachments WHERE id = $1',
                [attachmentId]
            );

            if (result.rows.length === 0) {
                throw new Error('Attachment not found');
            }

            const attachment = result.rows[0];

            // Delete file from disk
            try {
                await fs.unlink(attachment.file_path);
                console.log(`🗑️ Deleted file: ${attachment.original_filename}`);
            } catch (error) {
                console.error('Error deleting file from disk:', error);
            }

            // Delete from database
            await pool.query('DELETE FROM attachments WHERE id = $1', [attachmentId]);

            return true;
        } catch (error) {
            console.error('Error deleting attachment:', error);
            throw error;
        }
    }
}

module.exports = new AttachmentService();