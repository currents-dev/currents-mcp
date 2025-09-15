import { ProjectListResponse } from "../types.js";
import { logger } from "./logger.js";
import { fetchPaginatedApi } from "./request.js";

export const getProjectMap = async () => {
  const projects = await fetchPaginatedApi<ProjectListResponse[]>("/projects");

  if (!projects) {
    logger.error("Failed to retrieve projects");
    return new Map();
  }

  return new Map(projects.map((p) => [p.name, p]));
};
