import { EvaluatorType } from "shared"
import { getFlagEmoji } from "./format"

export function renderEnrichment(data: any, type: EvaluatorType) {
  if (type === "language") {
    return getFlagEmoji(data)
  }
  return JSON.stringify(data)
}

// const renderEnrichment = (key, value) => {
//   switch (key) {
//     case "sentiment":
//       let emoji
//       let type

//       if (value > 0.5) {
//         emoji = <IconMoodSmile color="teal" />
//         type = "positive"
//       } else if (value < -0.5) {
//         emoji = <IconMoodSad color="crimson" />
//         type = "negative"
//       } else {
//         emoji = <IconMoodNeutral color="gray" />
//         type = "neutral"
//       }

//       return {
//         element: (
//           <Group gap="xs">
//             {emoji} {value}
//           </Group>
//         ),
//         help: "Sentiment: " + type,
//       }
//     case "pii":
//       if (value === "soft") return { element: "⚠️" }
//       else if (value === "hard") return { element: "❌" }
//       else return { element: "❎" }

//     case "topics":
//       return {
//         element: (
//           <Group gap="xs">
//             {value?.map((topic) => (
//               <Badge
//                 key={topic}
//                 variant="outline"
//                 color={getColorFromSeed(topic)}
//                 size="sm"
//                 style={{ textTransform: "none" }}
//               >
//                 {topic}
//               </Badge>
//             ))}
//           </Group>
//         ),
//         help: "Topics",
//       }
//     default:
//       return { element: value, help: key }
//   }
// }
