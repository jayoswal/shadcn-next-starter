import { NextResponse } from "next/server"

export const runtime = "nodejs"

type TranscriptMessage = {
  turn_id: number
  role: string
  content: string
  language_name?: string
}

type TranscriptUpstreamResponse = {
  interaction_id: string
  messages: TranscriptMessage[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const interactionId = searchParams.get("interactionId")

  if (!interactionId) {
    return NextResponse.json({ error: "interactionId is required." }, { status: 400 })
  }

  const { SARVAM_API_KEY, SARVAM_ORG_ID, SARVAM_WORKSPACE_ID, SARVAM_APP_ID } = process.env

  if (!SARVAM_API_KEY || !SARVAM_ORG_ID || !SARVAM_WORKSPACE_ID || !SARVAM_APP_ID) {
    console.error("Sarvam transcript config is missing required environment variables.")
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }

  // interaction_id itself contains a "/" (e.g. "20260829/60a204b8-15:27:24-de9ece72"),
  // so it's appended as-is after /transcripts/ rather than as a single encoded segment.
  const upstreamUrl = `https://apps.sarvam.ai/api/analytics/v1/${SARVAM_ORG_ID}/${SARVAM_WORKSPACE_ID}/${SARVAM_APP_ID}/transcripts/${interactionId}`

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers: { "X-API-Key": SARVAM_API_KEY },
    })

    const upstreamData = (await upstreamResponse
      .json()
      .catch(() => null)) as TranscriptUpstreamResponse | null

    if (!upstreamResponse.ok || !upstreamData?.messages) {
      console.error("Sarvam transcript fetch failed", {
        status: upstreamResponse.status,
        body: upstreamData,
      })
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 502 }
      )
    }

    return NextResponse.json(
      {
        interactionId: upstreamData.interaction_id,
        messages: upstreamData.messages.map((message) => ({
          turnId: message.turn_id,
          role: message.role,
          content: message.content,
        })),
      },
      { status: 200 }
    )
  } catch (err) {
    console.error("Sarvam transcript request threw", err)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
