import { z } from "zod";
import { fetchPaginatedApi } from "../../lib/request.js";

const zodSchema = z.object({});

const handler = async () => {
  const data = await fetchPaginatedApi("/projects");

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve projects",
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
};

export const getProjectsTool = {
  schema: zodSchema.shape,
  handler,
};
