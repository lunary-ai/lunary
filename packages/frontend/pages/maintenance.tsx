// pages/maintenance.tsx
import { useRouter } from "next/router"
import React, { useEffect } from "react"

export default function Maintenance() {
  const router = useRouter()
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE !== "on") {
      router.push("/")
    }
  }, [router])

  return (
    <div>
      <h1>We&apos;re currently undergoing maintenance</h1>
      <p>
        Rest assured, all your new events are safely stored and will be
        accessible once we&apos;re back.
      </p>
    </div>
  )
}
