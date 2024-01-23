import postgres from "postgres"
import RunInputOutput from "../../components/Blocks/RunInputOutput"
import { Container, Stack } from "@mantine/core"
import Logo from "@/components/Blocks/Logo"

const sql = postgres(process.env.DATABASE_URL!)

export async function getServerSideProps(context) {
  try {
    const runId = context.query.id

    const [run] = await sql`select * from run where id = ${runId}`

    if (run.is_public) {
      return { props: { run: JSON.stringify(run) } }
    }
    return { props: { run: null } }
  } catch (error) {
    // TODO: would probably be better to redirect to an error page, or show an alert
    return {
      redirect: {
        permanent: false,
        destination: "/",
      },
      props: {},
    }
  }
}

export default function LLMCall(props) {
  const run = JSON.parse(props.run)
  return (
    <Container size="sm">
      <Stack gap="xl">
        <Logo />
        <RunInputOutput
          initialRun={run}
          withPlayground={false}
          withShare={false}
        />
      </Stack>
    </Container>
  )
}
