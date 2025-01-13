import lunary
from openai import OpenAI
import time

client = OpenAI()
lunary.monitor(client)

thread = lunary.open_thread()

message = { "role": "user", "content": "Hello!" }
msg_id = thread.track_message(message)
chat_completion = client.chat.completions.create(
    messages=[message],
    model="gpt-4o",
    parent=msg_id
)


thread.track_message({
  "role": "assistant",
  "content": chat_completion.choices[0].message.content 
})

time.sleep(0.5)

thread.track_message({
  "role": "user",
  "content": "I have a question about your product."
})
time.sleep(0.5)

msg_id = thread.track_message({
  "role": "assistant",
  "content": "Sure, happy to help. What's your question?"
})
#time.sleep(0.5)

# lunary.track_feedback(msg_id, {
#     "thumbs": "down",
#     "comment": "I don't feel comfortable sharing my credit card number."
# })

