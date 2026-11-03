import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  const data = await request.json();
  const publishToken = request.headers.get("X-Publish-Token");

  if (!publishToken) {
    return new Response(
      JSON.stringify({
        code: 400,
        message: "Missing Publish Token",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Validate required fields
  const requiredFields = ["trackName", "artistName"];
  for (const field of requiredFields) {
    if (!data[field]?.trim()) {
      return new Response(
        JSON.stringify({
          code: 400,
          message: `Missing required field: ${field}`,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }

  const plainLyrics = data.plainLyrics?.trim() || "";
  const syncedLyrics = data.syncedLyrics?.trim() || "";

  try {
    const response = await fetch("https://lrclib.net/api/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Publish-Token": publishToken,
        "Lrclib-Client":
          "LRCLIBup v1.0.0 (https://github.com/boidushya/lrclibup)",
      },
      body: JSON.stringify({
        trackName: data.trackName.trim(),
        artistName: data.artistName.trim(),
        albumName: data.albumName?.trim() || "",
        duration: data.duration ? parseInt(data.duration, 10) : undefined,
        plainLyrics,
        // LRCLIB stores empty fields as "no lyrics", not as instrumental: it needs this marker.
        syncedLyrics:
          plainLyrics || syncedLyrics ? syncedLyrics : "[au: instrumental]",
      }),
    });

    const responseText = await response.text();
    console.log("Response status:", response.status);
    console.log("Response text:", responseText);

    let result;
    try {
      result = responseText
        ? JSON.parse(responseText)
        : { message: "No response content" };
    } catch (parseError) {
      result = { message: responseText || "No response content" };
    }

    if (!response.ok) {
      return new Response(JSON.stringify(result), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Publish Error:", error);

    return new Response(
      JSON.stringify({
        code: 500,
        message:
          error instanceof Error ? error.message : "Failed to publish lyrics",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
