import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { uploadBufferAndShare } from "./services/nextcloudClient.js";

// Required in ES modules to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const filePath = path.join(__dirname, "test.png");
  const buffer = fs.readFileSync(filePath);

  const result = await uploadBufferAndShare({
    buffer,
    originalName: "test.png",
  });

  console.log("Upload result:");
  console.log(result);
}

main().catch((err) => {
  console.error("Test failed:");
  console.error(err);
});
