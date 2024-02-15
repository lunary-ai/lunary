// page that creates a new dataset and redirect to the new dataset page

import Router from "next/router"
import { useDatasets } from "@/utils/dataHooks"
import { generateSlug } from "random-word-slugs"
import { useEffect } from "react"

export default function NewDataset() {
  const { insert } = useDatasets()
  useEffect(() => {
    const insertDataset = async () => {
      const { id } = await insert({
        slug: generateSlug(),
      })
      Router.replace(`/datasets/${id}`)
    }
    insertDataset()
  }, [])

  return null
}
