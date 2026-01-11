import axios from "axios";
import crypto from "crypto";
import mime from "mime-types";
import dotenv from 'dotenv';

dotenv.config({ path: 'config.env' });

const baseUrl = process.env.NEXTCLOUD_BASE_URL;
const username = process.env.NEXTCLOUD_USER;
const password = process.env.NEXTCLOUD_APP_PASSWORD;
const uploadDir = process.env.NEXTCLOUD_UPLOAD_DIR || "/DiscordUploads";

if (!baseUrl || !username || !password) {
  throw new Error("Missing Nextcloud environment variables");
}

const webdavBase = `${baseUrl}/remote.php/dav/files/${encodeURIComponent(username)}`;
const ocsShareEndpoint = `${baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`;

const auth = { username, password };

export async function uploadBufferAndShare({ buffer, originalName, folder }) {
  const ext =
    originalName && originalName.includes(".")
      ? originalName.split(".").pop()
      : "bin";

  const id = crypto.randomUUID();
  const fileName = `${id}.${ext}`;

  const subdir = folder
    ? `/${folder.replace(/^\/+/, "").replace(/\/+$/, "")}`
    : "";

  const ncPath = `${uploadDir}${subdir}/${fileName}`;

  const mimeType =
    mime.lookup(originalName) || "application/octet-stream";

  // --- WebDAV upload ---
  const putUrl = `${webdavBase}${encodeURI(ncPath)}`;
  await axios.put(putUrl, buffer, {
    auth,
    headers: {
      "Content-Type": mimeType,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  // --- Create public share (read-only) ---
  const shareResp = await axios.post(
    ocsShareEndpoint,
    new URLSearchParams({
      path: ncPath,
      shareType: "3",   // public link
      permissions: "1"  // read-only
    }).toString(),
    {
      auth,
      headers: {
        "OCS-APIRequest": "true",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
    }
  );

  const shareUrl = shareResp?.data?.ocs?.data?.url;
  if (!shareUrl) {
    throw new Error("Nextcloud share API did not return a URL");
  }

  const data = shareResp?.data?.ocs?.data;

  return {
    ncPath,
    shareId: data.id,
    shareUrl: data.url,
    downloadUrl: `${data.url}/download`,
    mimeType,
    size: buffer.length,
  };
}

export async function deleteFile(ncPath) {
  const deleteUrl = `${webdavBase}${encodeURI(ncPath)}`;

  await axios.delete(deleteUrl, {
    auth,
  });
}

export async function deleteShare(shareId) {
  const url = `${baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares/${shareId}`;

  await axios.delete(url, {
    auth,
    headers: {
      "OCS-APIRequest": "true",
    },
  });
}