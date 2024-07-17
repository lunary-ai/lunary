import { useCallback, useEffect, useRef, useState } from "react"

import {
  Box,
  Button,
  Card,
  Flex,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
} from "@mantine/core"

import {
  IconBolt,
  IconBracketsAngle,
  IconCheck,
  IconDeviceFloppy,
  IconGitCommit,
} from "@tabler/icons-react"
import { useRouter } from "next/router"
import { openUpgrade } from "@/components/layout/UpgradeModal"
import HotkeysInfo from "@/components/blocks/HotkeysInfo"
import TemplateInputArea from "@/components/prompts/TemplateInputArea"
import TemplateList, {
  defaultTemplateVersion,
} from "@/components/prompts/TemplateMenu"
import { notifications } from "@mantine/notifications"
import { generateSlug } from "random-word-slugs"
import {
  useOrg,
  useTemplates,
  useTemplate,
  useTemplateVersion,
  useUser,
  useProject,
} from "@/utils/dataHooks"

import analytics from "@/utils/analytics"
import { useGlobalShortcut } from "@/utils/hooks"
import { fetcher } from "@/utils/fetcher"

import Empty from "@/components/layout/Empty"

import { useCheckedPromptVariables } from "@/utils/promptsHooks"
import { openConfirmModal } from "@mantine/modals"

import { ParamItem } from "@/components/prompts/Provider"
import ProviderEditor from "@/components/prompts/Provider"
import PromptVariableEditor from "@/components/prompts/PromptVariableEditor"

function NotepadButton({ value, onChange }) {
  const [modalOpened, setModalOpened] = useState(false)
  const [tempValue, setTempValue] = useState(value)

  useEffect(() => {
    setTempValue(value)
  }, [value])

  return (
    <>
      <Modal
        size="lg"
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Notepad"
      >
        <Textarea
          autosize
          minRows={5}
          maxRows={30}
          placeholder="Write down thoughts, ideas, or anything else you want to remember about this template."
          defaultValue={value}
          onChange={(e) => setTempValue(e.currentTarget.value)}
        />
        <Group mt="sm" align="right">
          <Button
            ml="auto"
            size="xs"
            variant="default"
            onClick={() => {
              onChange(tempValue)
              setModalOpened(false)
            }}
          >
            Save
          </Button>
        </Group>
      </Modal>
      <Button
        size="compact-xs"
        variant="outline"
        onClick={() => {
          setModalOpened(true)
        }}
      >
        {`Open`}
      </Button>
    </>
  )
}

function Playground() {
  const router = useRouter()

  const { project } = useProject()

  const [template, setTemplate] = useState<any>()
  const [templateVersion, setTemplateVersion] = useState<any>(
    defaultTemplateVersion,
  )

  const [hasChanges, setHasChanges] = useState(false)

  const { templates, insert, mutate } = useTemplates()
  const { insertVersion } = useTemplate(template?.id)
  const { update: updateVersion } = useTemplateVersion(templateVersion?.id)

  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(false)

  const [output, setOutput] = useState<any>(null)
  const [outputTokens, setOutputTokens] = useState<any>(null)
  const [error, setError] = useState(null)

  const [rename, setRename] = useState(null)

  useGlobalShortcut([
    [
      "mod+S",
      () => {
        if (hasChanges) saveTemplate()
      },
    ],
    [
      "mod+Enter",
      () => {
        if (!streaming) runPlayground()
      },
    ],
  ])

  const { mutate: revalidateUser } = useUser()
  const { org } = useOrg()

  // make sure to only fetch once
  const ref = useRef({ done: false })

  useEffect(() => {
    if (!project || ref.current?.done) return

    const { clone, id } = router.query

    // check if we want to clone an existing run
    if (id) {
      ref.current.done = true

      const fetchTemplate = async () => {
        setLoading(true)

        const data = await fetcher.get(
          `/template_versions/${id}?projectId=${project?.id}`,
        )

        if (data) {
          setTemplateVersion(data)
          setTemplate(data.template)
        }

        setLoading(false)
      }

      fetchTemplate()
    } else if (clone) {
      ref.current.done = true
      const fetchRun = async () => {
        setLoading(true)
        const run = await fetcher.get(`/runs/${clone}?projectId=${project?.id}`)

        if (run?.input) {
          setTemplateVersion({
            // ...templateVersion,
            content: run.input,
            extra: { ...run.params, model: run.name },
          })

          setTemplate({ mode: "openai" })

          setOutput(run.output)

          setOutputTokens(run.tokens?.completion)
        }

        setLoading(false)

        // remove the query params
        router.push("/prompts")
      }

      fetchRun()
    } else {
      setTemplate({ mode: "openai" })
      setTemplateVersion(defaultTemplateVersion)
    }
  }, [project, router.query])

  useEffect(() => {
    setHasChanges(false)
  }, [template?.id])

  // Save as draft without deploying
  const saveTemplate = async () => {
    if (templateVersion.isDraft && templateVersion.id) {
      await updateVersion(templateVersion)
    } else {
      const data = {
        testValues: templateVersion.testValues,
        content: templateVersion.content,
        extra: templateVersion.extra,
        notes: templateVersion.notes,
        isDraft: true,
      }

      if (template?.id) {
        const newVersion = await insertVersion(data)

        switchTemplateVersion(newVersion)
      } else {
        const newTemplate = await insert({
          slug: generateSlug(),
          mode: "openai",
          ...data,
        })

        setTemplate(newTemplate)
        switchTemplateVersion(newTemplate?.versions[0])
      }
    }

    setHasChanges(false)

    mutate()
  }

  const confirmDiscard = useCallback(
    (onProceed) => {
      if (hasChanges) {
        return openConfirmModal({
          title: "Discard changes?",
          confirmProps: { color: "red" },

          children: (
            <Text size="sm">
              You have unsaved changes. Are you sure you want to discard them?
            </Text>
          ),
          labels: { confirm: "Confirm", cancel: "Cancel" },
          onConfirm() {
            onProceed()
            setHasChanges(false)
          },
        })
      }

      onProceed()
    },
    [hasChanges],
  )

  const createTemplate = async () => {
    confirmDiscard(async () => {
      const slug = generateSlug(2)
      const newTemplate = await insert({
        mode: "openai",
        slug,
        ...defaultTemplateVersion,
      })
      setTemplate(newTemplate)
      setRename(newTemplate.id)
      switchTemplateVersion(newTemplate.versions[0])
      mutate()
    })
  }

  // Deploy the template
  const commitTemplate = async () => {
    if (templateVersion.isDraft && templateVersion.id) {
      await updateVersion({
        ...templateVersion,
        isDraft: false,
      })

      setTemplateVersion({ ...templateVersion, isDraft: false })
    } else {
      const data = {
        testValues: templateVersion.testValues,
        content: templateVersion.content,
        extra: templateVersion.extra,
        notes: templateVersion.notes,
        isDraft: false,
      }

      if (!template?.id) {
        const newTemplate = await insert({
          slug: generateSlug(2),
          mode: "openai",
          ...data,
        })

        setTemplate(newTemplate)
        switchTemplateVersion(newTemplate?.versions[0])
      } else {
        const newVersion = await insertVersion(data)

        switchTemplateVersion(newVersion)
      }
    }

    notifications.show({
      title: "Template deployed",
      icon: <IconCheck size={24} />,
      message: "A new version of your template is now being served.",
      color: "teal",
    })

    setHasChanges(false)

    mutate()
  }

  const runPlayground = async () => {
    const model = template.extra?.model

    if (org?.plan === "free" || !org?.playAllowance) {
      return openUpgrade("playground")
    }

    analytics.track("RunPlayground", {
      model,
    })

    setError(null)
    setOutput(null)
    setOutputTokens(0)
    setStreaming(true)

    try {
      await fetcher.getStream(
        `/orgs/${org?.id}/playground`,
        {
          content: templateVersion.content,
          extra: templateVersion.extra,
          variables: templateVersion.testValues,
        },
        (chunk) => {
          try {
            const parsedLine = JSON.parse(chunk)

            setOutput(parsedLine.choices[0]?.message)
            setOutputTokens(parsedLine.usage?.completion_tokens || 0)
            setError(null)
          } catch (error) {
            console.error(error)
          }
        },
      )

      // scroll template-input-area to the end
      const element = document.getElementById("template-input-area")
      element.scrollTop = element.scrollHeight
    } catch (e) {
      console.error(e)
      setError(e)
    }

    revalidateUser()

    setStreaming(false)
  }

  // reset output when the template or template version changes, but not if cloned
  useEffect(() => {
    if (!router.query.clone) {
      setOutput(null)
      setError(null)
      setOutputTokens(0)
    }
  }, [
    template?.id,
    templateVersion?.id,
    templateVersion?.extra?.model,
    typeof templateVersion?.content, // when switching from chat to text mode
  ])

  const switchTemplateVersion = (v) => {
    setTemplateVersion(v)
    router.push(`/prompts/${v.id}`)
  }

  const variables = useCheckedPromptVariables(
    templateVersion?.content,
    templateVersion?.testValues,
  )

  return (
    <Empty
      enable={templates && !templates.length && !router.query.clone}
      title="Create prompt templates"
      features={[
        "Collaborate with non-technical people",
        "Clean up your source-code",
        "Easily roll-back to previous versions",
        "Test models such as Mistral, Claude v2, Bison & more.",
      ]}
      Icon={IconBracketsAngle}
      buttonLabel="Create first template"
      onClick={createTemplate}
    >
      <Flex w="100%" h="100%">
        <Box
          flex={`0 0 230px`}
          py="sm"
          style={{ borderRight: "1px solid rgba(120, 120, 120, 0.1)" }}
        >
          <TemplateList
            rename={rename}
            createTemplate={createTemplate}
            setRename={setRename}
            activeTemplate={template}
            activeVersion={templateVersion}
            switchTemplateVersion={(t, v) => {
              const proceed = () => {
                setTemplate(t)
                switchTemplateVersion(v)
              }

              // means we are deleting the template and already went through confirm
              if (!t) return proceed()

              confirmDiscard(() => {
                proceed()
              })
            }}
          />
        </Box>
        <Box
          p="xl"
          flex="1"
          style={{ borderRight: "1px solid rgba(120, 120, 120, 0.1)" }}
        >
          <Box
            mah="100%"
            style={{ overflowY: "auto" }}
            id="template-input-area"
          >
            <TemplateInputArea
              template={templateVersion}
              setTemplate={setTemplateVersion}
              saveTemplate={saveTemplate}
              setHasChanges={setHasChanges}
              output={output}
              outputTokens={outputTokens}
              error={error}
            />
          </Box>
        </Box>
        <Box p="xl">
          <Stack style={{ zIndex: 0 }}>
            {template && templateVersion && (
              <Group>
                <Button
                  leftSection={<IconDeviceFloppy size={18} />}
                  size="xs"
                  loading={loading}
                  data-testid="save-template"
                  disabled={loading || (template?.id && !hasChanges)}
                  variant="outline"
                  // rightSection={
                  // <HotkeysInfo hot="S" size="sm" style={{ marginTop: -4 }} />
                  // }
                  onClick={saveTemplate}
                >
                  {templateVersion?.id
                    ? "Save changes"
                    : "Save as new template"}
                </Button>

                {templateVersion?.id && (
                  <Button
                    leftSection={<IconGitCommit size={18} />}
                    size="xs"
                    loading={loading}
                    data-testid="deploy-template"
                    disabled={
                      loading || !(templateVersion?.isDraft || hasChanges)
                    }
                    variant="filled"
                    onClick={commitTemplate}
                  >
                    Deploy
                  </Button>
                )}
              </Group>
            )}

            <ParamItem
              name="Template Mode"
              value={
                <SegmentedControl
                  size="xs"
                  disabled={loading || !templateVersion?.isDraft}
                  data={[
                    {
                      value: "chat",
                      label: "Chat",
                    },
                    {
                      value: "text",
                      label: "Text",
                    },
                  ]}
                  value={
                    typeof templateVersion.content === "string"
                      ? "text"
                      : "chat"
                  }
                  onChange={(value) => {
                    const newTemplateVersion = { ...templateVersion }
                    const isTextAlready =
                      typeof templateVersion.content === "string"
                    if (isTextAlready && value !== "text") {
                      // Switching from text to custom/openai
                      newTemplateVersion.content = [
                        { role: "user", content: templateVersion.content },
                      ]
                    } else if (!isTextAlready && value === "text") {
                      // Switching from custom/openai to text
                      const firstUserMessage = templateVersion.content[0]

                      newTemplateVersion.content =
                        firstUserMessage?.content || ""
                    }
                    setTemplateVersion(newTemplateVersion)
                  }}
                />
              }
            />

            {template?.id && templateVersion?.id && (
              <ParamItem
                name="Notepad"
                description="Write down thoughts or ideas you want to remember about this template. Notes are versioned."
                value={
                  <NotepadButton
                    value={templateVersion?.notes}
                    onChange={async (notes) => {
                      const data = {
                        ...templateVersion,
                        notes,
                      }

                      setTemplateVersion(data)

                      // save directly without bumping version so no changes are lost
                      await updateVersion(data)

                      mutate()
                    }}
                  />
                }
              />
            )}

            <ProviderEditor
              value={{
                model: templateVersion?.extra?.model,
                config: templateVersion?.extra,
              }}
              onChange={(val) => {
                setHasChanges(true)
                setTemplateVersion({
                  ...templateVersion,
                  extra: { ...val.config, model: val.model },
                })
              }}
            />

            {template && (
              <Card shadow="sm" p="sm" my="md">
                <PromptVariableEditor
                  value={variables}
                  onChange={(update) => {
                    setTemplateVersion({
                      ...templateVersion,
                      testValues: update,
                    })
                  }}
                />
              </Card>
            )}

            <Button
              leftSection={<IconBolt size="16" />}
              size="sm"
              disabled={loading}
              onClick={runPlayground}
              data-testid="run-playground"
              loading={streaming}
              rightSection={
                <HotkeysInfo hot="Enter" size="sm" style={{ marginTop: -4 }} />
              }
            >
              {template?.id ? "Test template" : "Run"}
            </Button>
          </Stack>
        </Box>
      </Flex>
    </Empty>
  )
}

export default Playground
