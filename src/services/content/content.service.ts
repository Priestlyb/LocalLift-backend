import Content, {
    IContent,
} from "../../models/Content";

class ContentService {
    /**
     * Creates a content record.
     */
    async create(
        data: Partial<IContent>
    ) {
        return Content.create(data);
    }

    /**
     * Returns a content item by ID.
     */
    async getById(
        contentId: string
    ) {
        return Content.findById(
            contentId
        )
            .populate("business")
            .populate("user");
    }

    /**
     * Returns a content item belonging
     * to a specific user.
     */
    async getUserContent(
        userId: string,
        contentId: string
    ) {
        return Content.findOne({
            _id: contentId,
            user: userId,
        }).populate("business");
    }

    /**
     * Returns all content for a user.
     */
    async getHistory(
        userId: string
    ) {
        return Content.find({
            user: userId,
        }).sort({
            createdAt: -1,
        });
    }

    /**
     * Returns paginated history.
     */
    async getHistoryPage(
        userId: string,
        page = 1,
        limit = 20
    ) {
        const skip =
            (page - 1) * limit;

        const [items, total] =
            await Promise.all([
                Content.find({
                    user: userId,
                })
                    .sort({
                        createdAt: -1,
                    })
                    .skip(skip)
                    .limit(limit),

                Content.countDocuments({
                    user: userId,
                }),
            ]);

        return {
            items,
            page,
            limit,
            total,
            totalPages: Math.ceil(
                total / limit
            ),
        };
    }

    /**
     * Updates a content item.
     */
    async update(
        contentId: string,
        data: Partial<IContent>
    ) {
        return Content.findByIdAndUpdate(
            contentId,
            data,
            {
                new: true,
            }
        );
    }

    /**
     * Deletes a user's content.
     */
    async delete(
        userId: string,
        contentId: string
    ) {
        return Content.findOneAndDelete({
            _id: contentId,
            user: userId,
        });
    }

    /**
     * Soft deletes a content item.
     */
    async softDelete(
        contentId: string
    ) {
        return Content.findByIdAndUpdate(
            contentId,
            {
                deletedAt: new Date(),
            },
            {
                new: true,
            }
        );
    }

    /**
     * Returns recently generated content.
     */
    async getRecent(
        limit = 10
    ) {
        return Content.find()
            .sort({
                createdAt: -1,
            })
            .limit(limit);
    }

    /**
     * Returns content count for a user.
     */
    async countByUser(
        userId: string
    ) {
        return Content.countDocuments({
            user: userId,
        });
    }

    /**
     * Returns content count for a business.
     */
    async countByBusiness(
        businessId: string
    ) {
        return Content.countDocuments({
            business: businessId,
        });
    }
}

export default new ContentService();