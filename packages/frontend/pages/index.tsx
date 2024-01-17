import { Center, Loader } from "@mantine/core"
import Router from "next/router"
import { useEffect } from "react"

function IndexPage() {
  useEffect(() => {
    Router.replace("/analytics")
  }, [])

  return (
    <Center h="100vh" w="100vw">
      <Loader />
    </Center>
  )
}

export default IndexPage
