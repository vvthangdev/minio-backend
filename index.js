const express = require("express");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const dotenv = require("dotenv");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Cấu hình MinIO client
const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

// Cấu hình Multer để lưu file tạm thời
const upload = multer({ dest: "uploads/" });

// API upload ảnh
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    const fileName = `images/${Date.now()}_${file.originalname}`;

    // Upload file lên MinIO
    const command = new PutObjectCommand({
      Bucket: process.env.MINIO_BUCKET,
      Key: fileName,
      Body: fs.createReadStream(file.path),
      ContentType: file.mimetype,
    });

    await s3Client.send(command);

    // Xóa file tạm
    fs.unlinkSync(file.path);

    // Tạo public URL
    const fileUrl = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${process.env.MINIO_BUCKET}/${fileName}`;

    res.json({ fileUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Không thể upload file" });
  }
});

// Tạo thư mục uploads nếu chưa có
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.listen(process.env.PORT, () => {
  console.log(`Server chạy tại http://localhost:${process.env.PORT}`);
});