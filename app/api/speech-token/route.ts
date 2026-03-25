import { NextResponse } from "next/server";

export async function GET() {
  try {
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;

    if (!speechKey || !speechRegion) {
      return NextResponse.json(
        { error: "Azure Speech credentials are missing." },
        { status: 500 }
      );
    }

    const tokenUrl = `https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": speechKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": "0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Failed to fetch Azure token: ${errorText}` },
        { status: response.status }
      );
    }

    const token = await response.text();

    return NextResponse.json({
      token,
      region: speechRegion,
    });
  } catch (error) {
    console.error("Speech token route error:", error);

    return NextResponse.json(
      { error: "Internal server error while fetching speech token." },
      { status: 500 }
    );
  }
}