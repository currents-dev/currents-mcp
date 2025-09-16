import { CURRENTS_API_KEY, CURRENTS_API_URL } from "./env.js";
import { logger } from "./logger.js";

const USER_AGENT = "currents-app/1.0";

export interface PaginatedResponse<T> {
  status: string;
  has_more: boolean;
  data: T[];
}

export async function fetchApi<T>(path: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
    Authorization: "Bearer " + CURRENTS_API_KEY,
  };

  try {
    const response = await fetch(`${CURRENTS_API_URL}${path}`, { headers });
    if (!response.ok) {
      logger.error(`HTTP error! status: ${response.status}`);
      logger.error(response);
      return null;
    }
    return (await response.json()) as T;
  } catch (error: any) {
    logger.error("Error making Currents request:", error.toString());
    return null;
  }
}

export async function fetchPaginatedApi<T>(path: string): Promise<T | null> {
  const allData: T[] = [];
  let hasMore: boolean = true;

  do {
    const response = await fetchApi<PaginatedResponse<T>>(path);
    if (!response) {
      return null;
    }
    allData.push(...response.data);
    hasMore = response.has_more;
  } while (hasMore);

  return allData as T;
}
