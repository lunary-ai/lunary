from lunary import LunaryCallbackHandler
from langchain_openai import ChatOpenAI

handler1 = LunaryCallbackHandler(app_id="07ff18c9-f052-4260-9e89-ea93fe9ba8c5")
handler2 = LunaryCallbackHandler(app_id="5f3553ff-028c-4b8c-86c4-134627ab5e51")

chat = ChatOpenAI(
  callbacks=[handler1, handler2],
)
chat.stream("Write a random string of 4 letters")