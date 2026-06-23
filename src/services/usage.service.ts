import Usage from "../models/Usage";

export const getCurrentMonth = () => {
    const now = new Date();

    return `${now.getFullYear()}-${now.getMonth() + 1}`;
};

export const getOrCreateUsage = async (
    userId: string
) => {
    const month = getCurrentMonth();

    let usage = await Usage.findOne({
        user: userId,
    });

    if (!usage) {
        usage = await Usage.create({
            user: userId,
            currentMonth: month,
        });
    }

    if (usage.currentMonth !== month) {
        usage.currentMonth = month;
        usage.generationsUsed = 0;

        await usage.save();
    }

    return usage;
};