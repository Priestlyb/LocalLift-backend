import {
    Response,
    NextFunction,
} from "express";

import { AuthRequest } from "../middleware/auth.middleware";

import schedulerService from "../services/scheduler/scheduler.service";

interface ScheduleParams {
    id: string;
}

class SchedulerController {
    /**
     * Create a scheduled post.
     */
    async createSchedule(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ) {
        try {
            if (!req.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized.",
                });
            }

            const schedule =
                await schedulerService.createSchedule({
                    owner: req.userId,

                    business: req.body.business,

                    content: req.body.content,

                    caption: req.body.caption,

                    hashtags: req.body.hashtags,

                    imageUrl: req.body.imageUrl,

                    platforms: req.body.platforms,

                    scheduledFor: new Date(
                        req.body.scheduledFor
                    ),

                    timezone:
                        req.body.timezone,
                });

            return res.status(201).json({
                success: true,
                message:
                    "Post scheduled successfully.",
                data: schedule,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Returns all schedules for
     * the authenticated user.
     */
    async getSchedules(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ) {
        try {
            if (!req.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized.",
                });
            }

            const schedules =
                await schedulerService.getSchedules(
                    req.userId
                );

            return res.json({
                success: true,
                data: schedules,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Returns one scheduled post.
     */
    async getSchedule(
        req: AuthRequest & {
            params: ScheduleParams;
        },
        res: Response,
        next: NextFunction
    ) {
        try {
            if (!req.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized.",
                });
            }

            const schedule =
                await schedulerService.getSchedule(
                    req.userId,
                    req.params.id
                );

            if (!schedule) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Scheduled post not found.",
                });
            }

            return res.json({
                success: true,
                data: schedule,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update a pending schedule.
     */
    async updateSchedule(
        req: AuthRequest & {
            params: ScheduleParams;
        },
        res: Response,
        next: NextFunction
    ) {
        try {
            if (!req.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized.",
                });
            }

            const schedule =
                await schedulerService.updateSchedule(
                    req.userId,
                    req.params.id,
                    req.body
                );

            return res.json({
                success: true,
                message:
                    "Schedule updated successfully.",
                data: schedule,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cancel a scheduled post.
     */
    async cancelSchedule(
        req: AuthRequest & {
            params: ScheduleParams;
        },
        res: Response,
        next: NextFunction
    ) {
        try {
            if (!req.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized.",
                });
            }

            const schedule =
                await schedulerService.cancelSchedule(
                    req.userId,
                    req.params.id
                );

            return res.json({
                success: true,
                message:
                    "Schedule cancelled successfully.",
                data: schedule,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete a scheduled post.
     */
    async deleteSchedule(
        req: AuthRequest & {
            params: ScheduleParams;
        },
        res: Response,
        next: NextFunction
    ) {
        try {
            if (!req.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized.",
                });
            }

            await schedulerService.deleteSchedule(
                req.userId,
                req.params.id
            );

            return res.json({
                success: true,
                message:
                    "Schedule deleted successfully.",
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new SchedulerController();