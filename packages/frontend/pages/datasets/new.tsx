// page that creates a new dataset and redirect to the new dataset page

import { useDatasets } from "@/utils/dataHooks"
import Router from "next/router"
import { useEffect } from "react"

export default function NewDataset() {
  const { insert } = useDatasets()
  useEffect(() => {
    const insertDataset = async () => {
      const { id } = await insert()
      Router.push(`/datasets/${id}`)
    }
    insertDataset()
  }, [])

  return null
}
