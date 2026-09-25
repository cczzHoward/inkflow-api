const ArticleRepository = require('../../../src/repositories/article');
const ArticleModel = require('../../../src/models/article');

jest.mock('../../../src/models/article');

describe('ArticleRepository', () => {
    describe('create', () => {
        it('should create an article', async () => {
            // Arrange
            const mockArticle = { title: 'Test Article' };
            const saveMock = jest.fn().mockResolvedValue(mockArticle);
            // mock new ArticleModel(data)
            ArticleModel.mockImplementation(() => ({
                save: saveMock,
            }));

            // Act
            const result = await ArticleRepository.create(mockArticle);

            // Assert
            expect(ArticleModel).toHaveBeenCalledWith(mockArticle);
            expect(saveMock).toHaveBeenCalled();
            expect(result).toEqual(mockArticle);
        });
    });

    describe('update', () => {
        it('should update an article', async () => {
            // Arrange
            const mockArticle = { title: 'Updated Article' };
            ArticleModel.findByIdAndUpdate.mockResolvedValue(mockArticle);

            // Act
            const result = await ArticleRepository.update('123', mockArticle);

            // Assert
            expect(ArticleModel.findByIdAndUpdate).toHaveBeenCalledWith('123', mockArticle, {
                new: true,
            });
            expect(result).toEqual(mockArticle);
        });
    });

    describe('delete', () => {
        it('should delete an article', async () => {
            // Arrange
            const mockArticle = { title: 'Deleted Article' };
            ArticleModel.findByIdAndDelete.mockResolvedValue(mockArticle);

            // Act
            const result = await ArticleRepository.delete('123');

            // Assert
            expect(ArticleModel.findByIdAndDelete).toHaveBeenCalledWith('123', {});
            expect(result).toEqual(mockArticle);
        });
    });

    describe('findAll', () => {
        it('should return all articles', async () => {
            // Arrange
            const mockArticle = [{ title: 'Test Article' }];
            // 建立 chainable mock
            const populateMock = jest.fn();
            // 第一次 populate 回傳一個物件，裡面有第二個 populate
            // 第二次 populate 回傳 mockData
            populateMock
                .mockReturnValueOnce({ populate: populateMock }) // 第一次 chain
                .mockReturnValueOnce(mockArticle); // 第二次 chain，回傳資料

            ArticleModel.find.mockReturnValue({ populate: populateMock });

            // Act
            const result = await ArticleRepository.findAll();

            // Assert
            expect(ArticleModel.find).toHaveBeenCalled();
            expect(populateMock).toHaveBeenCalledTimes(2);
            expect(result).toEqual(mockArticle);
        });
    });

    describe('findById', () => {
        it('should return an article by ID', async () => {
            // Arrange
            // chain: findById().populate().populate().populate().lean()
            const mockDoc = {
                _id: '123',
                title: 'Test Article',
                comments: [{ content: 'first' }, { content: 'second' }],
                likedBy: ['user1', 'user2', 'user3'],
            };
            const leanMock = jest.fn().mockResolvedValue(mockDoc);
            const populateMock = jest.fn();
            populateMock
                .mockReturnValueOnce({ populate: populateMock })
                .mockReturnValueOnce({ populate: populateMock })
                .mockReturnValueOnce({ lean: leanMock });

            ArticleModel.findById.mockReturnValue({ populate: populateMock });

            // Act
            const result = await ArticleRepository.findById('123');

            // Assert
            expect(ArticleModel.findById).toHaveBeenCalledWith('123');
            expect(populateMock).toHaveBeenCalledTimes(3);
            expect(leanMock).toHaveBeenCalled();
            expect(result).toEqual({
                ...mockDoc,
                comments_count: 2,
                likes_count: 3,
                id: '123',
            });
        });
    });

    describe('searchAndPaginate', () => {
        it('should return paginated articles based on search criteria', async () => {
            // Arrange
            const mockDocs = [
                {
                    _id: 'article1',
                    title: 'Test Article',
                    comments: ['comment1'],
                    likedBy: ['user1', 'user2'],
                },
            ];
            const mockCount = 10;

            // 建立 chainable mock，最後以 lean() 收尾
            const chain = {
                select: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockDocs),
            };

            // 讓 find 回傳 chain，然後你可以在最後直接 mock find 的回傳值
            ArticleModel.find.mockReturnValue(chain);
            ArticleModel.countDocuments.mockResolvedValue(mockCount);

            // Act
            const result = await ArticleRepository.searchAndPaginate({
                keyword: 'Test',
                category: 'Tech',
                page: 1,
                limit: 5,
            });

            // Assert
            expect(ArticleModel.find).toHaveBeenCalled();
            expect(ArticleModel.countDocuments).toHaveBeenCalled();
            expect(chain.lean).toHaveBeenCalled();
            expect(result).toEqual({
                data: [
                    {
                        ...mockDocs[0],
                        comments: undefined, // payload 已移除 comments 陣列
                        comments_count: 1,
                        likes_count: 2,
                        id: 'article1',
                    },
                ],
                total: mockCount,
                page: 1,
                limit: 5,
                totalPages: 2,
            });
        });
    });

    describe('getCategoryIdByName', () => {
        it('should return category ID by name', async () => {
            // Arrange
            const mockCategory = [{ category: 'Tech' }];
            ArticleModel.find.mockReturnValue({
                select: jest.fn().mockReturnValue(mockCategory),
            });

            // Act
            const result = await ArticleRepository.getCategoryIdByName('Tech');

            // Assert
            expect(ArticleModel.find).toHaveBeenCalledWith({ category: 'Tech' });
            expect(result).toEqual(mockCategory);
        });
    });

    describe('getAuthorIdByArticle', () => {
        it('should return author ID by article ID', async () => {
            // Arrange
            const mockAuthor = { author: 'Author123' };
            ArticleModel.findById.mockReturnValue({
                select: jest.fn().mockReturnValue(mockAuthor),
            });

            // Act
            const result = await ArticleRepository.getAuthorIdByArticle('123');

            // Assert
            expect(ArticleModel.findById).toHaveBeenCalledWith('123');
            expect(result).toEqual(mockAuthor);
        });
    });
});
