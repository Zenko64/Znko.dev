import type { AppContext } from "#types/hono";
import { AppError } from "#core/errors";

export function assertExistsAndOwns<T extends { uploaderId: number; public: boolean }>(
  resource: T | null | undefined,
  userId: number | undefined,
  resourceName: string,
  action: string,
  config: {
    allowPublic?: boolean;
  } = {
    allowPublic: false,
  },
): asserts resource is T {
  // Thank you Claude for teaching me this pattern <3
  if (!resource || (!resource.public && resource.uploaderId !== userId)) {
    throw new AppError(`The specified ${resourceName} was not found.`, 404);
  }
  if (
    resource.uploaderId !== userId &&
    !(config.allowPublic && resource.public)
  ) {
    throw new AppError(
      `You don't have permission to ${action} this ${resourceName}.`,
      403,
    );
  }
}

export function getAuthUser(c: AppContext): { userId: number } {
  const session = c.get("session");
  if (!session.userId) {
    throw new AppError("Unauthorized", 401);
  }

  return { userId: session.userId };
}
