import { z } from "zod";
import { fetchPaginatedApi } from "../../lib/request.js";
import { ProjectListResponse } from "../../types.js";

const zodSchema = z.object({});

const handler = async () => {
  const projects = await fetchPaginatedApi<ProjectListResponse>("/projects");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(projects, null, 2),
      },
    ],
  };
};

export const getProjectsTool = {
  schema: zodSchema.shape,
  handler,
};
