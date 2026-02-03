const { google } = require("googleapis");
const auth = require("./googleAuth");

/**
 * Lấy danh sách slide từ Google Slides
 * @param {string} presentationId
 * @returns [{ index, slideId }]
 */
async function getSlidesMeta(presentationId) {
    const slidesApi = google.slides({
        version: "v1",
        auth,
    });

    const res = await slidesApi.presentations.get({
        presentationId,
    });

    const slides = res.data.slides || [];

    return slides.map((slide, idx) => ({
        index: idx + 1,
        slideId: slide.objectId,
    }));
}

async function getThumbnailUrl(presentationId, pageId) {
    const slidesApi = google.slides({
        version: "v1",
        auth,
    });

    const res = await slidesApi.presentations.pages.getThumbnail({
        presentationId: presentationId,
        pageObjectId: pageId,
        'thumbnailProperties.thumbnailSize': 'LARGE'
    });

    // Đây chính là link ảnh để bạn dùng axios tải về
    return res.data.contentUrl;
}

module.exports = {
    getSlidesMeta,
    getThumbnailUrl,
};
