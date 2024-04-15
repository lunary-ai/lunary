import { test } from "@playwright/test"
import { deleteOrg } from "./utils/db"

test("clean up database", async ({}) => {
  await deleteOrg()
})
