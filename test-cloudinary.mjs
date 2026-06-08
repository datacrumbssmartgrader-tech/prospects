import { v2 as cloudinary } from "cloudinary";

// Configure with real credentials
cloudinary.config({
  cloud_name: "dbhdn7jv4",
  api_key: "893724965371322",
  api_secret: "KcfKtz99re1wOrMONhvZNGQdSL8",
});

// 1. Upload a sample image from Cloudinary's demo domain
console.log("Uploading sample image...");
const uploadResult = await cloudinary.uploader.upload(
  "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  { folder: "cognos-crm/test" }
);

console.log("Secure URL:", uploadResult.secure_url);
console.log("Public ID: ", uploadResult.public_id);

// 2. Fetch metadata about the uploaded image
const details = await cloudinary.api.resource(uploadResult.public_id);
console.log("\nImage details:");
console.log("  Width:     ", details.width, "px");
console.log("  Height:    ", details.height, "px");
console.log("  Format:    ", details.format);
console.log("  File size: ", details.bytes, "bytes");

// 3. Generate a transformed URL
//    f_auto — Cloudinary picks the best format for the browser (WebP, AVIF, etc.)
//    q_auto — Cloudinary picks the optimal quality level to reduce file size
const transformedUrl = cloudinary.url(uploadResult.public_id, {
  transformation: [{ fetch_format: "auto", quality: "auto" }],
  secure: true,
});

console.log("\nDone! Click the link below to see the optimized version of the image.");
console.log("Check the size and the format compared to the original.");
console.log("\nTransformed URL:", transformedUrl);
