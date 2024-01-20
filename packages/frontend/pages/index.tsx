import { useAuth } from "@/utils/auth"
import { Center, Loader } from "@mantine/core"
import Router from "next/router"
import { useEffect } from "react"

function IndexPage() {
  const { isSignedIn } = useAuth()
  useEffect(() => {
    Router.replace(isSignedIn ? "/analytics" : "/login")
  }, [])

  return (
    <Center h="100vh" w="100vw">
      <Loader />
    </Center>
  )
}

export default IndexPage
