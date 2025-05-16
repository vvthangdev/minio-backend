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
  endpoint: process.env.MINIO_ENDPOINT,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

// Cấu hình Multer
const upload = multer({ dest: "uploads/" });

// API upload ảnh
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    // Thay khoảng trắng bằng dấu gạch dưới
    const safeFileName = file.originalname.replace(/\s+/g, "_");
    const fileName = `${Date.now()}_${safeFileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.MINIO_BUCKET,
      Key: fileName,
      Body: fs.createReadStream(file.path),
      ContentType: file.mimetype,
      ACL: "public-read",
    });

    await s3Client.send(command);
    fs.unlinkSync(file.path);

    // Trả về URL công khai
    const fileUrl = `https://vuvanthang.website/media/${fileName}`;
    res.json({ fileUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Không thể upload file" });
  }
});

// Tạo thư mục uploads
const uploadDir = path.join(__dirname, "../Uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
  console.log(`Minio endpoint: ${process.env.MINIO_ENDPOINT}`);
});
