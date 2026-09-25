const AuthController = require('../../../src/controllers/auth');
const AuthService = require('../../../src/services/auth');

jest.mock('../../../src/services/auth');

describe('AuthController', () => {
    describe('register', () => {
        it('should return 201 and user data on successful registration', async () => {
            // Arrange
            const mockReq = { body: { username: 'testuser', password: 'password123' } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            AuthService.register.mockResolvedValue({ _id: '123', username: 'testuser' });

            // Act
            await AuthController.register(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { id: '123', username: 'testuser' },
                    message: 'User registered successfully',
                    success: true,
                })
            );
        });

        it('should return 409 if user already exists', async () => {
            // Arrange
            const mockReq = { body: { username: 'existinguser', password: 'password123' } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            AuthService.register.mockRejectedValue(new Error('User already exists'));

            // Act
            await AuthController.register(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(409);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'User already exists',
                })
            );
        });

        it('should return 500 on internal server error', async () => {
            // Arrange
            const mockReq = { body: { username: 'testuser', password: 'password123' } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            AuthService.register.mockRejectedValue(new Error('Internal server error'));

            // Act
            await AuthController.register(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Internal server error',
                })
            );
        });
    });

    describe('login', () => {
        it('should return 200 and JWT token on successful login', async () => {
            // Arrange
            const mockReq = { body: { username: 'testuser', password: 'password123' } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            AuthService.login.mockResolvedValue('jwtToken123');

            // Act
            await AuthController.login(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { token: 'jwtToken123' },
                    message: 'User logged in successfully',
                    success: true,
                })
            );
        });

        it('should return 401 if user not found invalid password', async () => {
            // Arrange
            const mockReq = { body: { username: 'testuser', password: 'wrongpassword' } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            AuthService.login.mockRejectedValue(new Error('User not found'));

            // Act
            await AuthController.login(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Invalid username or password',
                })
            );
        });

        it('should return 401 if password is invalid', async () => {
            // Arrange
            const mockReq = { body: { username: 'testuser', password: 'wrongpassword' } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            AuthService.login.mockRejectedValue(new Error('Invalid password'));

            // Act
            await AuthController.login(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Invalid username or password',
                })
            );
        });

        it('should return 500 on internal server error', async () => {
            // Arrange
            const mockReq = { body: { username: 'testuser', password: 'password123' } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            AuthService.login.mockRejectedValue(new Error('Internal server error'));

            // Act
            await AuthController.login(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Internal server error',
                })
            );
        });
    });

    describe('changePassword', () => {
        it('should return 200 on successful password change', async () => {
            // Arrange
            const mockReq = {
                body: { oldPassword: 'oldpass', newPassword: 'newpass' },
                user: { id: 'userId' },
            };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            AuthService.changePassword.mockResolvedValue({ _id: 'userId' });

            // Act
            await AuthController.changePassword(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Password changed successfully',
                    success: true,
                })
            );
        });

        it('should return 400 if new password is the same as old password', async () => {
            // Arrange
            const mockReq = {
                body: { oldPassword: 'samepass', newPassword: 'samepass' },
                user: { id: 'userId' },
            };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            // Act
            await AuthController.changePassword(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'New password cannot be the same as old password',
                })
            );
        });

        // 注意：舊密碼錯誤回 400 而非 401。使用者的 JWT 本身是有效的，
        // 失敗的是 request body 的內容；且前端 axios interceptor 會在收到 401 時
        // 清掉 localStorage 的 auth_token，若這裡回 401 會導致打錯一次舊密碼就被登出。
        it('should return 400 if old password is invalid', async () => {
            // Arrange
            const mockReq = {
                body: { oldPassword: 'wrongoldpass', newPassword: 'newpass' },
                user: { id: 'userId' },
            };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            AuthService.changePassword.mockRejectedValue(new Error('Invalid old password'));

            // Act
            await AuthController.changePassword(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Invalid old password',
                })
            );
        });

        it('should return 404 if user not found', async () => {
            // Arrange
            const mockReq = {
                body: { oldPassword: 'oldpass', newPassword: 'newpass' },
                user: { id: 'nonexistentUserId' },
            };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            AuthService.changePassword.mockRejectedValue(new Error('User not found'));

            // Act
            await AuthController.changePassword(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'User not found',
                })
            );
        });

        it('should return 500 on internal server error', async () => {
            // Arrange
            const mockReq = {
                body: { oldPassword: 'oldpass', newPassword: 'newpass' },
                user: { id: 'userId' },
            };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            AuthService.changePassword.mockRejectedValue(new Error('Internal server error'));

            // Act
            await AuthController.changePassword(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Internal server error',
                })
            );
        });
    });
});
