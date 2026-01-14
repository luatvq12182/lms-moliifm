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
    setPermissionAnyoneReader,
    setPermissionDomainReader,
};