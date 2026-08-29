"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, PhoneIncoming } from "lucide-react"
import { getCalApi } from "@calcom/embed-react"
import { hints } from "driver.js/hints"
import "driver.js/dist/hints.css"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const CAL_LINK = "drapeai"
const PHONE_FIELD_ID = "phone-number-field"
const CALL_ATTEMPTS_STORAGE_KEY = "dework_call_attempts"
const GENERIC_CALL_ERROR = "Something went wrong. Please try again."

/**
 * Validates a phone number against two rules:
 * 1. Digits cannot all be identical (e.g. "9999999999").
 * 2. No run of more than 4 consecutive ascending or descending digits
 *    (e.g. "12345" or "98765"), while "1234" (4 digits) is still allowed.
 */
function getPhoneValidationError(digits: string): string | null {
  if (digits.length === 0) return null

  if (/^(\d)\1+$/.test(digits)) {
    return "Phone number can't have all the same digits."
  }

  let ascendingRun = 1
  let descendingRun = 1
  let longestRun = 1

  for (let i = 1; i < digits.length; i++) {
    const prev = Number(digits[i - 1])
    const cur = Number(digits[i])

    ascendingRun = cur === prev + 1 ? ascendingRun + 1 : 1
    descendingRun = cur === prev - 1 ? descendingRun + 1 : 1
    longestRun = Math.max(longestRun, ascendingRun, descendingRun)
  }

  if (longestRun > 4) {
    return "Phone number can't contain more than 4 sequential digits."
  }

  return null
}

type StoredCallAttempt = {
  attemptId: string
  phoneNumber: string
  createdAt: string
}

/** Appends a new outbound-call attempt id to the visitor's local history. */
function storeCallAttempt(attemptId: string, phoneNumber: string) {
  if (typeof window === "undefined") return

  try {
    const raw = window.localStorage.getItem(CALL_ATTEMPTS_STORAGE_KEY)
    const existing: StoredCallAttempt[] = raw ? JSON.parse(raw) : []
    const next: StoredCallAttempt[] = [
      ...existing,
      { attemptId, phoneNumber, createdAt: new Date().toISOString() },
    ]
    window.localStorage.setItem(CALL_ATTEMPTS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // localStorage may be unavailable (e.g. private browsing); the attempt
    // still succeeded server-side, so this is a non-fatal, silent no-op.
  }
}

type CountryCode = {
  id: string
  name: string
  dialCode: string
  flag: React.ReactNode
}

const LANGUAGES = [
  "اردو",
  "हिन्दी",
  "বাংলা",
  "தமிழ்",
  "తెలుగు",
  "मराठी",
  "ਪੰਜਾਬੀ",
  "ગુજરાતી",
  "ಕನ್ನಡ",
  "മലയാളം",
]

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

function buildTrack(offset: number, trackWidth: number, pillEdge: "left" | "right", squeezeZone: number) {
  const step = 9
  const numSlots = Math.ceil(trackWidth / step) + 4
  const patternLength = numSlots * step

  return Array.from({ length: numSlots }, (_, i) => {
    const x = ((i * step + offset) % patternLength) - step
    const h = 22 + Math.abs(Math.sin(i * 0.9) * 55) + Math.abs(Math.sin(i * 2.1)) * 23
    const dist = pillEdge === "right" ? trackWidth - x : x
    const f = smoothstep(0, squeezeZone, dist)
    const s = 0.1 + 0.9 * f
    return {
      x: Math.round(x * 10) / 10,
      h: Math.round(Math.min(100, h)),
      s: Math.round(s * 100) / 100,
    }
  })
}

function IndiaFlag() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" className="shrink-0 rounded-[2px]">
      <rect width="20" height="14" fill="#fff" />
      <rect width="20" height="4.67" fill="#FF9933" />
      <rect width="20" height="4.67" y="9.33" fill="#138808" />
      <circle cx="10" cy="7" r="2" fill="none" stroke="#000080" strokeWidth="0.4" />
    </svg>
  )
}

const COUNTRY_CODES: CountryCode[] = [
  { id: "in", name: "India", dialCode: "+91", flag: <IndiaFlag /> },
  { id: "us", name: "United States", dialCode: "+1", flag: <span className="text-base leading-none">🇺🇸</span> },
  { id: "gb", name: "United Kingdom", dialCode: "+44", flag: <span className="text-base leading-none">🇬🇧</span> },
  { id: "ae", name: "United Arab Emirates", dialCode: "+971", flag: <span className="text-base leading-none">🇦🇪</span> },
  { id: "au", name: "Australia", dialCode: "+61", flag: <span className="text-base leading-none">🇦🇺</span> },
  { id: "sg", name: "Singapore", dialCode: "+65", flag: <span className="text-base leading-none">🇸🇬</span> },
]

function WaveformWordPill() {
  const [elapsed, setElapsed] = useState(0)
  const [containerWidth, setContainerWidth] = useState(148)
  const [pillWidth, setPillWidth] = useState(104)
  const startRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pillRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    startRef.current = performance.now()
    const loop = () => {
      setElapsed(performance.now() - startRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setContainerWidth(width)
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = pillRef.current
    if (!el) return

    // Measure the pill's real rendered (border-box) width so the tracks can
    // reserve exactly enough space for it — the squeeze animation needs to
    // happen just outside the pill's edge, otherwise it's hidden underneath.
    const observer = new ResizeObserver(() => {
      setPillWidth(el.getBoundingClientRect().width)
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Reserve exactly half the pill's measured width (plus a small breathing
  // gap) so the track's inner edge lines up with the pill's visible edge —
  // the squeeze zone then happens in the visible space just before it.
  const gapPx = Math.max(40, pillWidth / 2 + 6)
  const squeezeZone = 26
  const trackWidth = Math.max(60, containerWidth / 2 - gapPx)
  const cycleMs = 1100
  const scrollOffset = (elapsed / 1000) * 28
  const leftBars = buildTrack(scrollOffset, trackWidth, "right", squeezeZone)
  const rightBars = buildTrack(scrollOffset, trackWidth, "left", squeezeZone)

  const t = (elapsed % cycleMs) / cycleMs
  const index = Math.floor(elapsed / cycleMs) % LANGUAGES.length

  let envelope = 1
  if (t < 0.18) {
    envelope = smoothstep(0, 1, t / 0.18)
  } else if (t > 0.82) {
    envelope = 1 - smoothstep(0, 1, (t - 0.82) / 0.18)
  }

  return (
    <div ref={containerRef} className="relative h-10 w-full overflow-hidden lg:h-16">
      <div
        className="absolute top-1/2 left-0 h-10 -translate-y-1/2 overflow-hidden lg:h-16"
        style={{
          right: `calc(50% + ${gapPx}px)`,
          maskImage: `linear-gradient(to right, transparent 0, black ${squeezeZone}px, black 100%)`,
          WebkitMaskImage: `linear-gradient(to right, transparent 0, black ${squeezeZone}px, black 100%)`,
        }}
      >
        <div className="relative h-full w-full">
          {leftBars.map((b, i) => (
            <span
              key={i}
              className="absolute top-1/2 w-1 rounded-full bg-chart-2"
              style={{
                left: b.x,
                height: `${b.h}%`,
                transform: `translateY(-50%) scale(1, ${b.s})`,
              }}
            />
          ))}
        </div>
      </div>

      <div
        className="absolute top-1/2 right-0 h-10 -translate-y-1/2 overflow-hidden lg:h-16"
        style={{
          left: `calc(50% + ${gapPx}px)`,
          maskImage: `linear-gradient(to right, black 0, black calc(100% - ${squeezeZone}px), transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to right, black 0, black calc(100% - ${squeezeZone}px), transparent 100%)`,
        }}
      >
        <div className="relative h-full w-full">
          {rightBars.map((b, i) => (
            <span
              key={i}
              className="absolute top-1/2 w-1 rounded-full bg-chart-2"
              style={{
                left: b.x,
                height: `${b.h}%`,
                transform: `translateY(-50%) scale(1, ${b.s})`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <div
          ref={pillRef}
          className="flex h-10 min-w-[104px] items-center justify-center rounded-full bg-background px-[18px] shadow-[inset_0_0_0_1.5px_var(--ring)] lg:h-16 lg:min-w-[170px] lg:px-8 lg:shadow-[inset_0_0_0_2px_var(--ring)]"
        >
          <span
            className="inline-block whitespace-nowrap text-sm font-semibold text-primary lg:text-xl"
            style={{
              transform: `scaleX(${Math.max(0.02, envelope)})`,
              opacity: envelope,
              transformOrigin: "center",
            }}
          >
            {LANGUAGES[index]}
          </span>
        </div>
      </div>
    </div>
  )
}

function useCalBooking(calLink: string) {
  const calRef = useRef<Awaited<ReturnType<typeof getCalApi>> | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      const cal = await getCalApi({ namespace: "book-a-call" })
      if (!active) return
      calRef.current = cal
      cal("ui", {
        theme: "light",
        hideEventTypeDetails: false,
        layout: "month_view",
      })
    })()

    return () => {
      active = false
    }
  }, [])

  return () => {
    calRef.current?.("modal", { calLink })
  }
}

/**
 * Mounts a pulsing "feature hint" beacon on the phone number field,
 * introducing the instant-callback feature without blocking interaction
 * with the rest of the page.
 */
function usePhoneFieldHint() {
  useEffect(() => {
    const productHints = hints({
      hints: [
        {
          element: `#${PHONE_FIELD_ID}`,
          id: PHONE_FIELD_ID,
          beacon: { side: "top", align: "start", className: "dework-phone-hint-beacon" },
          popover: {
            title: "Instant callback",
            description:
              "Enter your number and our AI voice agent calls you back right away, speaking your preferred language.",
            side: "top",
            align: "start",
          },
        },
      ],
    })

    productHints.show()

    return () => {
      productHints.hide()
    }
  }, [])
}

export function DeworkHero() {
  const [phone, setPhone] = useState("")
  const [countryId, setCountryId] = useState("in")
  const [isCalling, setIsCalling] = useState(false)
  const [callResult, setCallResult] = useState<"success" | "error" | null>(null)
  const openBookingModal = useCalBooking(CAL_LINK)
  const selectedCountry = COUNTRY_CODES.find((c) => c.id === countryId) ?? COUNTRY_CODES[0]
  const phoneError = getPhoneValidationError(phone)
  usePhoneFieldHint()

  const canSubmitCall = phone.length > 0 && !phoneError && !isCalling

  async function handleCall() {
    if (!canSubmitCall) return

    const fullPhoneNumber = `${selectedCountry.dialCode}${phone}`
    setIsCalling(true)

    try {
      const response = await fetch("/api/outbound-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: fullPhoneNumber,
          metadata: { source: "website" },
        }),
      })

      const data = (await response.json().catch(() => null)) as
        | { attempt_id?: string }
        | null

      if (!response.ok || !data?.attempt_id) {
        setCallResult("error")
        return
      }

      storeCallAttempt(data.attempt_id, fullPhoneNumber)
      setCallResult("success")
    } catch {
      setCallResult("error")
    } finally {
      setIsCalling(false)
    }
  }

  return (
    <section className="flex min-h-[60svh] w-full flex-col overflow-hidden bg-background sm:min-h-0">
      <header className="w-full">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between px-6 py-6 sm:max-w-2xl lg:max-w-3xl lg:px-8 lg:py-8">
          <span className="text-base font-semibold text-foreground lg:text-xl">deWork Labs</span>
          <Button
            variant="outline"
            onPress={openBookingModal}
            className="h-auto rounded-full border-[1.5px] border-foreground bg-transparent px-[18px] py-2 text-sm font-medium text-foreground hover:bg-muted lg:px-6 lg:py-2.5 lg:text-base"
          >
            Book a call
          </Button>
        </div>
      </header>

      <div className="flex w-full flex-1 flex-col items-center justify-center gap-12 py-4 sm:gap-14 sm:py-6 lg:gap-16 lg:py-8">
        <div className="mx-auto w-full max-w-xl px-6 text-center sm:max-w-2xl lg:max-w-3xl lg:px-8">
          <h1 className="m-0 text-[26px] font-semibold tracking-[-0.01em] text-foreground sm:text-4xl lg:text-6xl">
            Voice OS for Enterprises
          </h1>
        </div>

        <div className="flex w-full flex-col items-center gap-4 lg:gap-6">
          <p className="text-[15px] text-muted-foreground sm:text-base lg:text-xl">
            Talk to our agents in:
          </p>

          <WaveformWordPill />
        </div>

        <div className="mx-auto w-full max-w-xl px-6 sm:max-w-2xl lg:max-w-3xl lg:px-8">
          <div className="mx-auto max-w-sm lg:max-w-md">
            <div
              id={PHONE_FIELD_ID}
              className={cn(
                "flex items-center gap-2.5 rounded-full border-[1.5px] px-[10px] py-2 pl-[14px] lg:gap-3 lg:py-2.5 lg:pl-5",
                phoneError ? "border-destructive" : "border-foreground"
              )}
            >
              <Select
                aria-label="Country code"
                selectedKey={countryId}
                onSelectionChange={(key) => setCountryId(String(key))}
                className="w-auto border-r border-border pr-[10px] lg:pr-3"
              >
                <SelectTrigger className="h-auto w-auto gap-1 rounded-none border-none bg-transparent p-0 text-[15px] whitespace-nowrap text-foreground shadow-none outline-none focus-visible:ring-0 [&_svg]:text-muted-foreground [&_svg:not([class*='size-'])]:size-3.5">
                  <SelectValue>
                    {() => (
                      <span className="flex items-center gap-1.5">
                        {selectedCountry.flag}
                        <span>{selectedCountry.dialCode}</span>
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map((country) => (
                    <SelectItem key={country.id} id={country.id} textValue={`${country.name} ${country.dialCode}`}>
                      <span className="flex w-full items-center gap-2">
                        {country.flag}
                        <span>{country.name}</span>
                        <span className="ml-auto text-muted-foreground">{country.dialCode}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="tel"
                aria-label="Phone number"
                aria-invalid={Boolean(phoneError)}
                aria-describedby={phoneError ? "phone-number-error" : undefined}
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className="h-auto flex-1 border-none bg-transparent px-0 py-0 text-[15px] text-foreground shadow-none ring-0 placeholder:text-muted-foreground/40 focus-visible:border-none focus-visible:ring-0 lg:text-lg"
              />

              <Button
                size="icon"
                onPress={handleCall}
                isDisabled={!canSubmitCall}
                isPending={isCalling}
                aria-label="Call me now"
                className="size-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 lg:size-11"
              >
                {isCalling ? (
                  <Loader2 className="size-[17px] animate-spin lg:size-5" />
                ) : (
                  <PhoneIncoming className="size-[17px] lg:size-5" />
                )}
              </Button>
            </div>

            {phoneError && (
              <p
                id="phone-number-error"
                role="alert"
                className="mt-2 text-center text-xs text-destructive lg:text-sm"
              >
                {phoneError}
              </p>
            )}
          </div>
        </div>
      </div>

      <svg
        viewBox="0 0 382 30"
        width="382"
        height="30"
        preserveAspectRatio="none"
        className="block h-[30px] w-full text-foreground [filter:drop-shadow(0_-8px_10px_hsl(var(--foreground)/0.15))] lg:h-[50px]"
      >
        <path d="M0,30 Q191,0 382,30" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>

      <Dialog
        isOpen={callResult === "success"}
        onOpenChange={(open) => !open && setCallResult(null)}
      >
        <DialogHeader>
          <DialogTitle>Call on its way</DialogTitle>
          <DialogDescription>
            We&apos;ve sent a call to your number — pick it up, then come back
            here for your call analysis.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton />
      </Dialog>

      <Dialog
        isOpen={callResult === "error"}
        onOpenChange={(open) => !open && setCallResult(null)}
      >
        <DialogHeader>
          <DialogTitle>Something went wrong</DialogTitle>
          <DialogDescription>{GENERIC_CALL_ERROR}</DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton />
      </Dialog>
    </section>
  )
}
