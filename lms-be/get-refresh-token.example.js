import http from "http";
import { google } from "googleapis";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET");
  process.exit(1);
}

const REDIRECT_URI = "http://127.0.0.1:5555/oauth2callback";
const SCOPES = ["https://www.googleapis.com/auth/drive"];

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",   // BẮT BUỘC
    prompt: "consent",        // BẮT BUỘC để lấy refresh_token
    scope: SCOPES,
});

console.log("Mở link này trong trình duyệt:\n");
console.log(authUrl);

const server = http.createServer(async (req, res) => {
    if (!req.url.startsWith("/oauth2callback")) {
        res.end("Waiting for OAuth callback...");
        return;
    }

    const url = new URL(req.url, REDIRECT_URI);
    const code = url.searchParams.get("code");

    if (!code) {
        res.end("No code found");
        return;
    }

    const { tokens } = await oauth2Client.getToken(code);

    console.log("\n===== TOKENS =====");
    console.log(tokens);

    console.log("\n===== REFRESH TOKEN =====");
    console.log(tokens.refresh_token);

    res.end("OK! Quay lại terminal để lấy refresh_token.");
    server.close();
});

server.listen(5555, () => {
    console.log("\nServer listening at http://127.0.0.1:5555");
});