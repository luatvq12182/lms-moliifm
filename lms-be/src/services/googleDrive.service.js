const fs = require("fs");
const { google } = require("googleapis");

function getOAuthClient() {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
        throw new Error("Missing GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN in env");
    }

    const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        "http://127.0.0.1:5555/oauth2callback" // redirect chỉ để lấy token; dùng lại cũng ok
    );

    oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
    return oauth2Client;
}

function getDrive() {
    const auth = getOAuthClient();
    return google.drive({ version: "v3", auth });
}

async function uploadDocxAsGoogleDocs({ localPath, fileName }) {
    const drive = getDrive();

    // 1) upload docx lên drive (file tạm)
    const uploaded = await drive.files.create({
        requestBody: {
            name: fileName,
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
        media: {
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            body: fs.createReadStream(localPath),
        },
        fields: "id",
    });

    const sourceId = uploaded.data.id;
    if (!sourceId) throw new Error("upload failed: missing source file id");

    // 2) convert: copy sang google docs
    const converted = await drive.files.copy({
        fileId: sourceId,
        requestBody: {
            name: fileName,
            mimeType: "application/vnd.google-apps.document",
        },
        fields: "id, webViewLink",
    });

    const fileId = converted.data.id;
    if (!fileId) throw new Error("convert failed: missing converted file id");

    // 3) dọn file tạm (docx source) để đỡ rác
    try {
        await drive.files.delete({ fileId: sourceId });
    } catch (e) {
        // không critical
        console.warn("delete temp docx failed:", e?.message || e);
    }

    // 4) previewUrl để embed
    const previewUrl = `https://docs.google.com/document/d/${fileId}/preview`;
    const webViewLink = converted.data.webViewLink || "";

    return { fileId, previewUrl, webViewLink };
}

async function uploadPptxAsGoogleSlides({ localPath, fileName }) {
    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || undefined;

    const res = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: folderId ? [folderId] : undefined,
            // ✅ convert -> Google Slides
            mimeType: "application/vnd.google-apps.presentation",
        },
        media: {
            // ✅ source PPTX
            mimeType:
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            body: require("fs").createReadStream(localPath),
        },
        fields: "id,name,mimeType,webViewLink",
    });

    const fileId = res.data.id;
    const previewUrl = `https://docs.google.com/presentation/d/${fileId}/preview`;

    return { fileId, previewUrl, webViewLink: res.data.webViewLink };
}

// permission helpers
async function setPermissionAnyoneReader(fileId) {
    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });

    await drive.permissions.create({
        fileId,
        requestBody: { type: "anyone", role: "reader" },
    });
}

// (tuỳ chọn) nếu bạn dùng Workspace domain
async function setPermissionDomainReader(fileId, domain) {
    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });

    await drive.permissions.create({
        fileId,
        requestBody: { type: "domain", role: "reader", domain },
    });
}

module.exports = {
    uploadPptxAsGoogleSlides,
    uploadDocxAsGoogleDocs,
    setPermissionAnyoneReader,
    setPermissionDomainReader,
};