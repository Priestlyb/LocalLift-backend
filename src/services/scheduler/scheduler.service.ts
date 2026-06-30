import ScheduledPost, {
  IScheduledPost,
} from "../../models/ScheduledPost";

import queueService from "./queue.service";

export interface CreateScheduleInput {
  owner: string;
  business: string;
  content: string;

  caption: string;

  hashtags?: string[];

  imageUrl: string;

  platforms: string[];

  scheduledFor: Date;

  timezone?: string;
}

class SchedulerService {
  /**
   * Creates a scheduled post and
   * queues it for publishing.
   */
  async createSchedule(
    data: CreateScheduleInput
  ): Promise<IScheduledPost> {
    if (
      data.scheduledFor <= new Date()
    ) {
      throw new Error(
        "Scheduled time must be in the future."
      );
    }

    const schedule =
      await ScheduledPost.create({
        owner: data.owner,

        business: data.business,

        content: data.content,

        caption: data.caption,

        hashtags:
          data.hashtags ?? [],

        imageUrl: data.imageUrl,

        platforms:
          data.platforms,

        scheduledFor:
          data.scheduledFor,

        timezone:
          data.timezone ??
          "Africa/Lagos",
      });

    await queueService.schedulePost(
      schedule
    );

    return schedule;
  }

  /**
   * Returns all scheduled posts
   * belonging to a user.
   */
  async getSchedules(
    owner: string
  ) {
    return ScheduledPost.find({
      owner,
      isDeleted: false,
    }).sort({
      scheduledFor: 1,
    });
  }

  /**
   * Returns one scheduled post.
   */
  async getSchedule(
    owner: string,
    id: string
  ) {
    return ScheduledPost.findOne({
      _id: id,
      owner,
      isDeleted: false,
    });
  }

  /**
   * Updates a pending schedule.
   */
  async updateSchedule(
    owner: string,
    id: string,
    updates: Partial<CreateScheduleInput>
  ) {
    const schedule =
      await ScheduledPost.findOne({
        _id: id,
        owner,
        isDeleted: false,
      });

    if (!schedule) {
      throw new Error(
        "Scheduled post not found."
      );
    }

    if (
      schedule.status !== "PENDING"
    ) {
      throw new Error(
        "Only pending posts can be updated."
      );
    }

    Object.assign(
      schedule,
      updates
    );

    await schedule.save();

    if (
      updates.scheduledFor
    ) {
      await queueService.reschedulePost(
        schedule
      );
    }

    return schedule;
  }

  /**
   * Cancels a scheduled post.
   */
  async cancelSchedule(
    owner: string,
    id: string
  ) {
    const schedule =
      await ScheduledPost.findOne({
        _id: id,
        owner,
        isDeleted: false,
      });

    if (!schedule) {
      throw new Error(
        "Scheduled post not found."
      );
    }

    schedule.status =
      "CANCELLED";

    await schedule.save();

    await queueService.cancelPost(
      schedule._id.toString()
    );

    return schedule;
  }

  /**
   * Soft deletes a scheduled post.
   */
  async deleteSchedule(
    owner: string,
    id: string
  ) {
    const schedule =
      await ScheduledPost.findOne({
        _id: id,
        owner,
        isDeleted: false,
      });

    if (!schedule) {
      throw new Error(
        "Scheduled post not found."
      );
    }

    schedule.isDeleted = true;

    await schedule.save();

    await queueService.cancelPost(
      schedule._id.toString()
    );

    return schedule;
  }

  /**
   * Marks a schedule as being processed.
   * Internal worker only.
   */
  async markProcessing(
    id: string
  ) {
    return ScheduledPost.findByIdAndUpdate(
      id,
      {
        status:
          "PROCESSING",
      },
      {
        new: true,
      }
    );
  }

  /**
   * Marks a schedule as published.
   * Internal worker only.
   */
  async markPublished(
    id: string
  ) {
    return ScheduledPost.findByIdAndUpdate(
      id,
      {
        status:
          "PUBLISHED",

        publishedAt:
          new Date(),

        lastError: "",
      },
      {
        new: true,
      }
    );
  }

  /**
   * Marks a schedule as failed.
   * Internal worker only.
   */
  async markFailed(
    id: string,
    error: string
  ) {
    return ScheduledPost.findByIdAndUpdate(
      id,
      {
        status: "FAILED",

        lastError: error,

        $inc: {
          retryCount: 1,
        },
      },
      {
        new: true,
      }
    );
  }

  /**
   * Returns all pending schedules
   * awaiting publication.
   * Internal worker only.
   */
  async getPendingSchedules() {
    return ScheduledPost.find({
      status: "PENDING",

      scheduledFor: {
        $lte: new Date(),
      },

      isDeleted: false,
    });
  }
}

export default new SchedulerService();