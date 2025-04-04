import { CURRENTS_API_KEY, CURRENTS_API_URL } from "./env.js";

const USER_AGENT = "currents-app/1.0";

export async function makeCurrentsRequest<T>(path: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
    Authorization: "Bearer " + CURRENTS_API_KEY,
  };

  try {
    const response = await fetch(`${CURRENTS_API_URL}${path}`, { headers });
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error: any) {
    console.error("Error making Currents request:", error.toString());
    return null;
  }
}
