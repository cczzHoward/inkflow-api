const cors = require('cors');

const allowedOrigins = [
    'https://cczzhoward.github.io', // GitHub Pages 上的 inkflow-web
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

const corsMiddleware = cors({
    origin: function (origin, callback) {
        // 情況 A: 沒有 origin 的請求
        // (例如：Postman, 後端對後端的打法, 手機 App) -> 允許通過
        if (!origin) return callback(null, true);

        // 情況 B: 請求的 origin 在我們的白名單內 -> 允許通過
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // 情況 C: 其他來源 -> 拒絕 (瀏覽器會顯示 CORS Error)
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'], // 允許的 HTTP 方法
    credentials: true, // 允許攜帶 Cookie
});

module.exports = corsMiddleware;
