import lunary
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
)

lunary.monitor(client)


with lunary.users.identify("user1", user_props={"email": "123@gle.com"}):
    completion = client.chat.completions.create(
        model="gpt-3.5-turbo", messages=[{"role": "user", "content": "Hello world"}]
    )
    print(completion.choices[0].message.content)


@lunary.agent("My great agent", user_id="123", tags=["test", "test2"])
def my_agent(a, b, c, test, test2):
    tool1("hello")
    output = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": "Hello world"}],
    )
    print(output)
    tool2("hello")
    return "Agent output"


@lunary.tool(name="tool 1", user_id="123")
def tool1(input):
    return "Output 1"


@lunary.tool()
def tool2(input):
    return "Output 2"


my_agent(1, 2, 3, test="sdkj", test2="sdkj")
