import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.post('/generate-presigned-url', async (req, res) => {
  const { fileName, fileType, secretCode } = req.body;

  // Verify secret code
  if (secretCode !== process.env.SECRET_CODE) {
    return res.status(403).json({ error: 'Mã bí mật không chính xác!' });
  }

  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'Thiếu thông tin file!' });
  }

  try {
    const key = `uploads/${Date.now()}_${fileName}`;
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    // URL valid for 1 hour to support large file uploads (~1GB)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    res.json({
      uploadUrl,
      key
    });
  } catch (error) {
    console.error('Lỗi tạo presigned URL:', error);
    res.status(500).json({ error: 'Không thể tạo URL upload. Vui lòng kiểm tra cấu hình AWS.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
