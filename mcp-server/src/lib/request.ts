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
    Accept: "application/json",
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

export async function postApi<T, B>(path: string, body: B): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: "Bearer " + CURRENTS_API_KEY,
  };

  try {
    const response = await fetch(`${CURRENTS_API_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      logger.error(`HTTP error! status: ${response.status}`);
      logger.error(response);
      return null;
    }
    return (await response.json()) as T;
  } catch (error: any) {
    logger.error("Error making Currents POST request:", error.toString());
    return null;
  }
}

export async function putApi<T, B = undefined>(
  path: string,
  body?: B
): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: "Bearer " + CURRENTS_API_KEY,
  };

  try {
    const response = await fetch(`${CURRENTS_API_URL}${path}`, {
      method: "PUT",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      logger.error(`HTTP error! status: ${response.status}`);
      logger.error(response);
      return null;
    }
    return (await response.json()) as T;
  } catch (error: any) {
    logger.error("Error making Currents PUT request:", error.toString());
    return null;
  }
}

export async function deleteApi<T>(path: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
    Authorization: "Bearer " + CURRENTS_API_KEY,
  };

  try {
    const response = await fetch(`${CURRENTS_API_URL}${path}`, {
      method: "DELETE",
      headers,
    });
    if (!response.ok) {
      logger.error(`HTTP error! status: ${response.status}`);
      logger.error(response);
      return null;
    }
    return (await response.json()) as T;
  } catch (error: any) {
    logger.error("Error making Currents DELETE request:", error.toString());
    return null;
  }
}

export async function fetchCursorBasedPaginatedApi<T>(
  path: string
): Promise<T[] | null> {
  const allData: T[] = [];
  let hasMore: boolean = false;
  let iteration: number = 0;

  do {
    if (iteration > 100) {
      logger.error("Too many iterations, stopping pagination");
      return allData;
    }

    let fullPath = path;
    if (hasMore && allData.length > 0) {
      fullPath += `?starting_after=${encodeURIComponent(
        (allData[allData.length - 1] as any).cursor
      )}`;
    }
    const response = await fetchApi<PaginatedResponse<T>>(fullPath);
    if (!response) {
      return null;
    }
    allData.push(...response.data);
    hasMore = response.has_more;
    iteration++;
  } while (hasMore);

  return allData;
}
