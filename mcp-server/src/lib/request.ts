import { CURRENTS_API_KEY, CURRENTS_API_URL } from "./env.js";
import { logger } from "./logger.js";

const USER_AGENT = "currents-app/1.0";

export interface PaginatedResponse<T> {
  status: string;
  has_more: boolean;
  data: T[];
}

let _lastApiError: string | null = null;

export function getLastApiError(): string | null {
  const err = _lastApiError;
  _lastApiError = null;
  return err;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (body && typeof body.error === "string") {
      return `HTTP ${response.status}: ${body.error}`;
    }
    return `HTTP ${response.status}: ${JSON.stringify(body)}`;
  } catch {
    try {
      const text = await response.text();
      return `HTTP ${response.status}: ${text || response.statusText}`;
    } catch {
      return `HTTP ${response.status}: ${response.statusText}`;
    }
  }
}

export async function fetchApi<T>(path: string): Promise<T | null> {
  _lastApiError = null;
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
    Authorization: "Bearer " + CURRENTS_API_KEY,
  };

  try {
    const response = await fetch(`${CURRENTS_API_URL}${path}`, { headers });
    if (!response.ok) {
      _lastApiError = await extractErrorMessage(response);
      logger.error(_lastApiError);
      return null;
    }
    return (await response.json()) as T;
  } catch (error: any) {
    _lastApiError = `Request error: ${error.toString()}`;
    logger.error("Error making Currents request:", error.toString());
    return null;
  }
}

export async function postApi<T, B>(path: string, body: B): Promise<T | null> {
  _lastApiError = null;
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
      _lastApiError = await extractErrorMessage(response);
      logger.error(_lastApiError);
      return null;
    }
    return (await response.json()) as T;
  } catch (error: any) {
    _lastApiError = `Request error: ${error.toString()}`;
    logger.error("Error making Currents POST request:", error.toString());
    return null;
  }
}

export async function putApi<T, B>(path: string, body?: B): Promise<T | null> {
  _lastApiError = null;
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
      _lastApiError = await extractErrorMessage(response);
      logger.error(_lastApiError);
      return null;
    }
    return (await response.json()) as T;
  } catch (error: any) {
    _lastApiError = `Request error: ${error.toString()}`;
    logger.error("Error making Currents PUT request:", error.toString());
    return null;
  }
}

export async function deleteApi<T>(path: string): Promise<T | null> {
  _lastApiError = null;
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
      _lastApiError = await extractErrorMessage(response);
      logger.error(_lastApiError);
      return null;
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return {} as T;
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return (await response.json()) as T;
    }
    return {} as T;
  } catch (error: any) {
    _lastApiError = `Request error: ${error.toString()}`;
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
