import { useEffect } from "react"
import Router from "next/router"

const IndexPage = () => {
  useEffect(() => {
    Router.replace("/analytics")
  }, [])

  return null
}

export default IndexPage
