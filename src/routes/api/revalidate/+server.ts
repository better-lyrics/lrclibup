import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  const data = await request.json();
  const { videoId, song, artist, album, duration } = data;
  const turnstileToken = request.headers.get("turnstile-token");

  if (!videoId) {
    return new Response(
      JSON.stringify({ success: false, message: "Missing videoId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!turnstileToken) {
    return new Response(
      JSON.stringify({ success: false, message: "Missing turnstile token" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL("https://lyrics.api.dacubeking.com/revalidate");
    url.searchParams.set("videoId", videoId);
    if (song) url.searchParams.set("song", song);
    if (artist) url.searchParams.set("artist", artist);
    if (album) url.searchParams.set("album", album);
    if (duration) url.searchParams.set("duration", String(duration));

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "turnstile-token": turnstileToken,
      },
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Revalidate Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Failed to revalidate cache",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
