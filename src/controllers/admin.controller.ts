import { Request, Response } from "express";

import User from "../models/User";
import Business from "../models/Business";
import Subscription from "../models/Subscription";
import Content from "../models/Content";
import Usage from "../models/Usage";

export const getUsers = async (
  req: Request,
  res: Response
) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      total: users.length,
      users,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const getBusinesses = async (
  req: Request,
  res: Response
) => {
  try {
    const businesses =
      await Business.find()
        .populate(
          "owner",
          "name email role"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      total: businesses.length,
      businesses,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const getSubscriptions = async (
  req: Request,
  res: Response
) => {
  try {
    const subscriptions =
      await Subscription.find()
        .populate(
          "user",
          "name email role"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      total:
        subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const deleteUserByAdmin =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { id } = req.params;

      const user =
        await User.findById(id);

      if (!user) {
        return res
          .status(404)
          .json({
            message:
              "User not found",
          });
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

        User.deleteMany({
          owner: id,
        }),
      ]);

      await User.findByIdAndDelete(
        id
      );

      return res.status(200).json({
        message:
          "User deleted successfully",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message:
          "Server Error",
      });
    }
  };