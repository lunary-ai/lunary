import { useAuth } from "@/utils/auth"
import { useUser } from "@/utils/dataHooks"
import { Center, Loader } from "@mantine/core"
import { useRouter } from "next/router"
import { useEffect } from "react"
import { hasAccess } from "shared"

function IndexPage() {
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const { user } = useUser()

  useEffect(() => {
    console.log(
      user.role,
      router.isReady,
      hasAccess(user.role, "analytics", "read"),
    )
    if (!router.isReady) {
      console.log("router not ready")
      return
    }
    if (!isSignedIn) {
      router.replace("/login")
      return
    }

    if (hasAccess(user.role, "analytics", "read")) {
      router.replace("/analytics")
    } else {
      router.replace("/prompts")
    }
  }, [user, router.isReady])

  return (
    <Center h="100vh" w="100vw">
      <Loader />
    </Center>
  )
}

export default IndexPage
