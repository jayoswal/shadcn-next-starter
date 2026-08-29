import { NextResponse } from "next/server"

export const runtime = "nodejs"

const E164_PATTERN = /^\+[1-9]\d{6,14}$/

type OutboundCallSuccess = {
  attempt_id: string
}

type OutboundCallErrorBody = {
  error?: {
    message?: string
    type?: string
    code?: number
    data?: {
      details?: string
    }
  }
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const phoneNumber = (body as { phoneNumber?: unknown } | null)?.phoneNumber
  const metadata = (body as { metadata?: Record<string, unknown> } | null)?.metadata

  if (typeof phoneNumber !== "string" || !E164_PATTERN.test(phoneNumber)) {
    return NextResponse.json(
      { error: "Please enter a valid phone number and try again." },
      { status: 400 }
    )
  }

  const {
    SARVAM_API_KEY,
    SARVAM_ORG_ID,
    SARVAM_WORKSPACE_ID,
    SARVAM_APP_ID,
    SARVAM_APP_VERSION,
    SARVAM_CONNECTION_ID,
    SARVAM_AGENT_PHONE_NUMBER,
    SARVAM_WEBHOOK_URL,
  } = process.env

  if (
    !SARVAM_API_KEY ||
    !SARVAM_ORG_ID ||
    !SARVAM_WORKSPACE_ID ||
    !SARVAM_APP_ID ||
    !SARVAM_CONNECTION_ID ||
    !SARVAM_AGENT_PHONE_NUMBER
  ) {
    console.error("Sarvam outbound call config is missing required environment variables.")
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }

  const upstreamUrl = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${SARVAM_ORG_ID}/workspaces/${SARVAM_WORKSPACE_ID}/outbounds`

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": SARVAM_API_KEY,
      },
      body: JSON.stringify({
        app_config: {
          app_id: SARVAM_APP_ID,
          app_version: Number(SARVAM_APP_VERSION ?? 1),
          app_type: "agent",
          connection_config: {
            connection_id: SARVAM_CONNECTION_ID,
            agent_phone_number: SARVAM_AGENT_PHONE_NUMBER,
          },
          agent_variables: {
            handler_name: "Riya",
          },
        },
        user_config: {
          user_phone_number: phoneNumber,
        },
        ...(SARVAM_WEBHOOK_URL
          ? {
              webhook_config: {
                url: SARVAM_WEBHOOK_URL,
                metadata: {
                  source: "website",
                  ...metadata,
                },
              },
            }
          : {}),
      }),
    })

    const upstreamData = (await upstreamResponse
      .json()
      .catch(() => null)) as (OutboundCallSuccess & OutboundCallErrorBody) | null

    if (!upstreamResponse.ok || !upstreamData?.attempt_id) {
      console.error("Sarvam outbound call failed", {
        status: upstreamResponse.status,
        body: upstreamData,
      })
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 502 }
      )
    }

    return NextResponse.json({ attempt_id: upstreamData.attempt_id }, { status: 200 })
  } catch (err) {
    console.error("Sarvam outbound call request threw", err)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
