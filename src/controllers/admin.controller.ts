import { Response } from "express";

import { AuthRequest } from "../middleware/auth.middleware";

import User from "../models/User";
import Business from "../models/Business";
import Subscription from "../models/Subscription";
import Content from "../models/Content";
import Usage from "../models/Usage";

const getPagination = (
  page?: string,
  limit?: string
) => {
  const currentPage = Math.max(
    Number(page ?? 1),
    1
  );

  const pageSize = Math.min(
    Math.max(Number(limit ?? 20), 1),
    100
  );

  return {
    page: currentPage,
    limit: pageSize,
    skip:
      (currentPage - 1) * pageSize,
  };
};

export const getUsers = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const {
      page,
      limit,
      skip,
    } = getPagination(
      req.query.page as string,
      req.query.limit as string
    );

    const [users, total] =
      await Promise.all([
        User.find()
          .select("-password")
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit),

        User.countDocuments(),
      ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      data: users,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getBusinesses =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const {
        page,
        limit,
        skip,
      } = getPagination(
        req.query.page as string,
        req.query.limit as string
      );

      const [
        businesses,
        total,
      ] = await Promise.all([
        Business.find()
          .populate(
            "owner",
            "name email role"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit),

        Business.countDocuments(),
      ]);

      return res.status(200).json({
        success: true,
        page,
        limit,
        total,
        data: businesses,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Server Error",
      });
    }
  };

export const getSubscriptions =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const {
        page,
        limit,
        skip,
      } = getPagination(
        req.query.page as string,
        req.query.limit as string
      );

      const [
        subscriptions,
        total,
      ] = await Promise.all([
        Subscription.find()
          .populate(
            "user",
            "name email role"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit),

        Subscription.countDocuments(),
      ]);

      return res.status(200).json({
        success: true,
        page,
        limit,
        total,
        data: subscriptions,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Server Error",
      });
    }
  };

export const deleteUserByAdmin =
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      const { id } = req.params;

      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      if (req.userId === id) {
        return res.status(400).json({
          success: false,
          message:
            "You cannot delete your own account.",
        });
      }

      const user =
        await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      if (user.role === "ADMIN") {
        const adminCount =
          await User.countDocuments({
            role: "ADMIN",
          });

        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            message:
              "Cannot delete the last administrator.",
          });
        }
      }

      await Promise.all([
        Subscription.deleteMany({
          user: id,
        }),

        Business.deleteMany({
          owner: id,
        }),

        Content.deleteMany({
          user: id,
        }),

        Usage.deleteMany({
          user: id,
        }),
      ]);

      await User.findByIdAndDelete(
        id
      );

      return res.status(200).json({
        success: true,
        message:
          "User deleted successfully.",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Server Error",
      });
    }
  };