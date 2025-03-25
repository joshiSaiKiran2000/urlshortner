import express from "express";
import shortid from "shortid";
import mongoose from "mongoose";
const app = express();

app.use(express.json());

mongoose.connect("mongodb://localhost:27017/urlShortener", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const UrlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true, unique: true },
  shortUrl: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 }, // Expires after 1 hour
  visitCount: { type: Number, default: 0 },
});

const Url = mongoose.model("Url", UrlSchema);

// Prevent duplicate short links
app.post("/shorten", async (req, res) => {
  const { originalUrl } = req.body;

  // Check if URL already exists
  let existingUrl = await Url.findOne({ originalUrl });
  if (existingUrl) {
    return res.json({
      originalUrl: existingUrl.originalUrl,
      shortUrl: `http://localhost:3000/${existingUrl.shortUrl}`,
      visitCount: existingUrl.visitCount,
      expiresAt: new Date(existingUrl.createdAt.getTime() + 3600 * 1000), // Show expiry time
    });
  }

  // Create new short URL
  const shortUrl = shortid.generate();
  const newUrl = new Url({ originalUrl, shortUrl });
  await newUrl.save();

  res.json({
    originalUrl,
    shortUrl: `http://localhost:3000/${shortUrl}`,
    expiresAt: new Date(newUrl.createdAt.getTime() + 3600 * 1000),
  });
});

// Redirect and track visits
app.get("/:shortUrl", async (req, res) => {
  const url = await Url.findOne({ shortUrl: req.params.shortUrl });

  if (!url) {
    return res.status(404).json({ error: "URL not found or expired" });
  }

  url.visitCount += 1;
  await url.save();

  res.redirect(url.originalUrl);
});

// Start server
app.listen(3000, () => console.log("Server running on port 3000"));
