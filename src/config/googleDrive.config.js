import dotenv from "dotenv";
import fs from "fs";
import { google } from "googleapis";

dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// ✅ تحميل التوكنات من ENV بدل tokens.json
if (process.env.GOOGLE_OAUTH_TOKENS) {
  try {
    const tokens = JSON.parse(process.env.GOOGLE_OAUTH_TOKENS);
    oauth2Client.setCredentials(tokens);
  } catch (error) {
    console.error(" Invalid GOOGLE_OAUTH_TOKENS format in .env:", error.message);
  }
}

// ⬇️ Utility function to get Drive client
export const driveClient = () => {
  return google.drive({ version: "v3", auth: oauth2Client });
};


/**
 * ✅ تأكد إن الفولدر موجود (لو مش موجود أنشئه)
 * @param {string} parentId - ID of parent folder
 * @param {string} folderName - اسم الفولدر المطلوب
 * @returns {Promise<string>} - folderId
 */
const ensureFolderExists = async (parentId, folderName) => {
  const drive = driveClient();

  // دور على الفولدر
  const query = `'${parentId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({ q: query, fields: "files(id, name)" });

  if (res.data.files.length > 0) {
    return res.data.files[0].id; // موجود بالفعل
  }

  // لو مش موجود → أنشئه
  const folderMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: [parentId],
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: "id, name",
  });

  return folder.data.id;
};

/**
 * ✅ Recursive function تنشئ مسار فولدر كامل (nested)
 * @param {string} baseFolderId - الفولدر الأساسي (مثلاً من .env)
 * @param {string[]} pathSegments - ["User","Submissions","Homework",...]
 * @returns {Promise<string>} - آخر folderId في المسار
 */
const ensureFolderPath = async (baseFolderId, pathSegments) => {
  let currentFolderId = baseFolderId;

  for (const segment of pathSegments) {
    currentFolderId = await ensureFolderExists(currentFolderId, segment);
  }

  return currentFolderId;
};

/**
 * ✅ رفع ملف لجوجل درايف
 */
export const uploadToDrive = async (filePath, fileName, mimeType, folderPath) => {
  try {
    const drive = driveClient();

    // قسم المسار لأجزاء
    const pathSegments = folderPath.split("/");

    // أنشئ الفولدرات كلها
    const targetFolderId = await ensureFolderPath(
      process.env.GOOGLE_DRIVE_FOLDER_ID, // Base folder
      pathSegments
    );

    const fileMetadata = {
      name: fileName,
      parents: [targetFolderId],
    };

    const media = {
      mimeType,
      body: fs.createReadStream(filePath),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id, name, webViewLink, webContentLink",
    });

    // امسح الملف بعد الرفع
    fs.unlink(filePath, (err) => {
      if (err) console.error(" Failed to delete local file:", err);
    });

    return file.data;
  } catch (error) {
    console.error(" Error uploading to Google Drive:", error);
    throw new Error(error.message);
  }
};
