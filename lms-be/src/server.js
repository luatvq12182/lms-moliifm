require("dotenv").config();
const app = require("./app");
const { connectDB } = require("./config/db");

async function main() {
    await connectDB(process.env.MONGODB_URI);

    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`server listening on :${port}`));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});