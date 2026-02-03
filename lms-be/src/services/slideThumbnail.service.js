const fs = require("fs");
const path = require("path");
const axios = require("axios");

/**
 * Export thumbnail PNG cho 1 slide
 * @param {Object}
 * @param {string} materialId
 * @param {string} slideId       // p1, p2, ...
 * @param {number} index
 */
async function exportSlideThumbnail({ materialId, slideId, index }) {
    const baseDir = path.join(
        process.cwd(),
        "uploads",
        "slides",
        materialId.toString()
    );

    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }

    const fileName = `${index}_${slideId}.png`;
    const filePath = path.join(baseDir, fileName);

    const url = `https://docs.google.com/presentation/d/${materialId}/export/png?pageid=${slideId}`;

    const res = await axios.get(url, {
        responseType: "stream",
    });

    await new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(filePath);
        res.data.pipe(stream);
        stream.on("finish", resolve);
        stream.on("error", reject);
    });

    return {
        path: filePath,
        url: `/uploads/slides/${materialId}/${fileName}`,
    };
}

module.exports = {
    exportSlideThumbnail,
};
