import { NextResponse } from "next/server"

export const runtime = "nodejs"

type AttemptItem = {
  attempt_id: string
  interaction_id: string
}

type ListAttemptsResponse = {
  items?: AttemptItem[]
  total?: number
  limit?: number
  offset?: number
}

// How far back to look for the attempt. A fresh outbound call always lands
// well within this window, so a single page is enough "for now".
const LOOKBACK_MS = 3 * 60 * 60 * 1000
const PAGE_LIMIT = 50

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const attemptId = searchParams.get("attemptId")

  if (!attemptId) {
    return NextResponse.json({ error: "attemptId is required." }, { status: 400 })
  }

  const { SARVAM_API_KEY, SARVAM_ORG_ID, SARVAM_WORKSPACE_ID, SARVAM_APP_ID } = process.env

  if (!SARVAM_API_KEY || !SARVAM_ORG_ID || !SARVAM_WORKSPACE_ID || !SARVAM_APP_ID) {
    console.error("Sarvam list-attempts config is missing required environment variables.")
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }

  const now = new Date()
  const start = new Date(now.getTime() - LOOKBACK_MS)

  const upstreamUrl = new URL(
    `https://apps.sarvam.ai/api/analytics/v1/${SARVAM_ORG_ID}/${SARVAM_WORKSPACE_ID}/${SARVAM_APP_ID}/attempts`
  )
  upstreamUrl.searchParams.set("start_datetime", start.toISOString())
  upstreamUrl.searchParams.set("end_datetime", now.toISOString())
  upstreamUrl.searchParams.set("limit", String(PAGE_LIMIT))
  upstreamUrl.searchParams.set("offset", "0")

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers: { "X-API-Key": SARVAM_API_KEY },
    })

    const upstreamData = (await upstreamResponse
      .json()
      .catch(() => null)) as ListAttemptsResponse | null

    if (!upstreamResponse.ok || !upstreamData) {
      console.error("Sarvam list-attempts failed", {
        status: upstreamResponse.status,
        body: upstreamData,
      })
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 502 }
      )
    }

    const match = upstreamData.items?.find((item) => item.attempt_id === attemptId)

    if (!match) {
      return NextResponse.json({ found: false }, { status: 200 })
    }

    return NextResponse.json(
      { found: true, interactionId: match.interaction_id },
      { status: 200 }
    )
  } catch (err) {
    console.error("Sarvam list-attempts request threw", err)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
