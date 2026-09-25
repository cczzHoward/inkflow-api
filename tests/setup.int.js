require('dotenv').config();

const logger = require('../src/utils/logger');

jest.spyOn(logger, 'info').mockImplementation(() => {});
jest.spyOn(logger, 'warn').mockImplementation(() => {});
jest.spyOn(logger, 'error').mockImplementation(() => {});

// Jest 會強制把 NODE_ENV 設成 'test'，而 src/database/dbConnection.js 在
// NODE_ENV === 'test' 時刻意不自動連線（避免 unit test 真的去連資料庫）。
// 但所有 model 都是綁在那條共用連線上的（connection.model(...)），
// 所以 integration test 必須自己把它開起來，否則每個 query 都只會被 buffer
// 到逾時為止。測試檔案裡的 mongoose.connect() 開的是另一條 default connection，
// 不會讓 model 動起來。
const connection = require('../src/database/dbConnection');

beforeAll(async () => {
    if (connection.readyState === 0) {
        await connection.openUri(process.env.MONGODB_URI);
    }
});

afterAll(async () => {
    await connection.close();
});
