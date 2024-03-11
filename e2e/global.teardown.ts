import { test } from "@playwright/test"
import { deleteOrg } from "./db-utils"

test("clean up database", async ({}) => {
  await deleteOrg()
})
