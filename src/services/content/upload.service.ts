import Content, {
  IContent,
} from "../../models/Content";

class UploadService {
  /**
   * Attaches an image to a content item.
   */
  async uploadImage(options: {
    contentId: string;
    userId: string;
    imageUrl: string;
  }): Promise<IContent> {
    const content =
      await Content.findOneAndUpdate(
        {
          _id: options.contentId,
          user: options.userId,
        },
        {
          imageUrl: options.imageUrl,
        },
        {
          new: true,
        }
      );

    if (!content) {
      throw new Error(
        "Content not found."
      );
    }

    return content;
  }

  /**
   * Attaches a video to a content item.
   */
  async uploadVideo(options: {
    contentId: string;
    userId: string;
    videoUrl: string;
  }): Promise<IContent> {
    const content =
      await Content.findOneAndUpdate(
        {
          _id: options.contentId,
          user: options.userId,
        },
        {
          videoUrl: options.videoUrl,
        },
        {
          new: true,
        }
      );

    if (!content) {
      throw new Error(
        "Content not found."
      );
    }

    return content;
  }

  /**
   * Stores arbitrary metadata for
   * generated content.
   */
  async updateMetadata(options: {
    contentId: string;
    userId: string;
    metadata: Record<
      string,
      unknown
    >;
  }): Promise<IContent> {
    const content =
      await Content.findOneAndUpdate(
        {
          _id: options.contentId,
          user: options.userId,
        },
        {
          metadata: options.metadata,
        },
        {
          new: true,
        }
      );

    if (!content) {
      throw new Error(
        "Content not found."
      );
    }

    return content;
  }

  /**
   * Removes uploaded media from
   * a content item.
   */
  async removeMedia(options: {
    contentId: string;
    userId: string;
  }): Promise<IContent> {
    const content =
      await Content.findOneAndUpdate(
        {
          _id: options.contentId,
          user: options.userId,
        },
        {
          imageUrl: null,
          videoUrl: null,
        },
        {
          new: true,
        }
      );

    if (!content) {
      throw new Error(
        "Content not found."
      );
    }

    return content;
  }
}

export default new UploadService();