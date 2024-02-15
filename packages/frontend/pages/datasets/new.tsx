// page that creates a new dataset and redirect to the new dataset page

import { useDatasets } from "@/utils/dataHooks"
import Router from "next/router"
import { generateSlug } from "random-word-slugs"
import { useEffect } from "react"

export default function NewDataset() {
  const { insert } = useDatasets()
  useEffect(() => {
    const insertDataset = async () => {
      const { id } = await insert({
        slug: generateSlug(),
      })
      Router.push(`/datasets/${id}`)
    }
    insertDataset()
  }, [])

  return null
}
