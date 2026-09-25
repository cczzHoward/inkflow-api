// 註冊新用戶（POST /api/v1/users/register）
// 登入取得 JWT（POST /api/v1/users/login）
// 變更密碼（POST /api/v1/users/change-password，需帶 token）

// 測試未帶 token、帶錯誤 token、權限不足時的回應。
const request = require('supertest');
const app = require('../../src/app');
const mongoose = require('mongoose');

describe('Auth API Integration Tests', () => {
    let adminToken, testUserId;
    beforeAll(async () => {
        // 連接到測試資料庫
        const dbUri = process.env.MONGODB_URI;
        await mongoose.connect(dbUri);
    });

    afterAll(async () => {
        // 登入 admin 並清除測試資料
        const loginResponse = await request(app)
            .post('/api/v1/users/login')
            .send({ username: 'admin', password: 'admin123' });
        adminToken = loginResponse.body.data.token;

        await request(app)
            .delete(`/api/v1/users/${testUserId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        // 關閉資料庫連接
        await mongoose.connection.close();
    });

    describe('register a new user', () => {
        it('should register a new user successfully', async () => {
            const newUser = {
                username: 'inttestuser',
                password: 'iamtestuser',
            };
            const response = await request(app).post('/api/v1/users/register').send(newUser);
            testUserId = response.body.data.id;
            expect(response.statusCode).toBe(201);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.message).toBe('User registered successfully');
            expect(response.body.success).toBe(true);
        });

        it('should fail to register with existing username', async () => {
            const existingUser = {
                username: 'inttestuser',
                password: 'iamtestuser2',
            };

            const response = await request(app).post('/api/v1/users/register').send(existingUser);
            expect(response.statusCode).toBe(409);
            expect(response.body.data).toBeNull();
            expect(response.body.message).toBe('User already exists');
            expect(response.body.success).toBe(false);
        });
    });

    describe('login to get JWT', () => {
        it('should login successfully and return JWT', async () => {
            const userCredentials = {
                username: 'inttestuser',
                password: 'iamtestuser',
            };

            const response = await request(app).post('/api/v1/users/login').send(userCredentials);
            expect(response.statusCode).toBe(200);
            expect(response.body.data).toHaveProperty('token');
            expect(response.body.message).toBe('User logged in successfully');
            expect(response.body.success).toBe(true);
        });

        it('should fail to login with incorrect credentials', async () => {
            const wrongCredentials = {
                username: 'inttestuser',
                password: 'wrongpassword',
            };

            const response = await request(app).post('/api/v1/users/login').send(wrongCredentials);
            expect(response.statusCode).toBe(401);
            expect(response.body.data).toBeNull();
            expect(response.body.message).toBe('Invalid username or password');
            expect(response.body.success).toBe(false);
        });
    });

    describe('change password with token', () => {
        let userToken;

        beforeAll(async () => {
            const userCredentials = {
                username: 'inttestuser',
                password: 'iamtestuser',
            };

            const response = await request(app).post('/api/v1/users/login').send(userCredentials);
            userToken = response.body.data.token;
        });

        it('should change password successfully with valid token', async () => {
            const changePasswordData = {
                oldPassword: 'iamtestuser',
                newPassword: 'newtestpassword',
            };

            const response = await request(app)
                .post('/api/v1/users/change-password')
                .set('Authorization', `Bearer ${userToken}`)
                .send(changePasswordData);
            expect(response.statusCode).toBe(200);
            expect(response.body.data).toBeNull();
            expect(response.body.message).toBe('Password changed successfully');
            expect(response.body.success).toBe(true);
        });

        it('should fail to change password with invalid token', async () => {
            const changePasswordData = {
                oldPassword: 'newtestpassword',
                newPassword: 'anothernewpassword',
            };

            const response = await request(app)
                .post('/api/v1/users/change-password')
                .set('Authorization', 'Bearer invalidtoken')
                .send(changePasswordData);
            expect(response.statusCode).toBe(401);
            expect(response.text).toBe('Unauthorized');
        });

        it('should fail to change password without token', async () => {
            const changePasswordData = {
                oldPassword: 'newtestpassword',
                newPassword: 'anothernewpassword',
            };

            const response = await request(app)
                .post('/api/v1/users/change-password')
                .send(changePasswordData);
            expect(response.statusCode).toBe(401);
            expect(response.text).toBe('Unauthorized');
        });

        it('should fail to change password if oldPassword is wrong', async () => {
            const changePasswordData = {
                oldPassword: 'wrongoldpassword',
                newPassword: 'anothernewpassword',
            };

            const response = await request(app)
                .post('/api/v1/users/change-password')
                .set('Authorization', `Bearer ${userToken}`)
                .send(changePasswordData);
            // 400（而非 401）：token 有效，錯的是 body 內容。回 401 會讓前端
            // interceptor 清掉 token，使用者打錯舊密碼就被登出。
            expect(response.statusCode).toBe(400);
            expect(response.body.data).toBeNull();
            expect(response.body.message).toBe('Invalid old password');
            expect(response.body.success).toBe(false);
        });

        it('should fail to change password without newPassword', async () => {
            const changePasswordData = {
                oldPassword: 'newtestpassword',
            };

            const response = await request(app)
                .post('/api/v1/users/change-password')
                .set('Authorization', `Bearer ${userToken}`)
                .send(changePasswordData);
            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe('Validation failed');
            expect(response.body.success).toBe(false);
        });

        it('should fail to change password with invalid newPassword format', async () => {
            const changePasswordData = {
                oldPassword: 'newtestpassword',
                newPassword: 'no',
            };

            const response = await request(app)
                .post('/api/v1/users/change-password')
                .set('Authorization', `Bearer ${userToken}`)
                .send(changePasswordData);
            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe('Validation failed');
            expect(response.body.success).toBe(false);
        });
    });
});
