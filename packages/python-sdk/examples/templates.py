import lunary
import os
from openai import OpenAI

client = OpenAI()

# The OpenAI client needs to be monitored by Lunary in order for templates to work
lunary.monitor(client)

template = lunary.render_template("wailing-waitress") # Replace with the name of the template you want to use

res = client.chat.completions.create(**template)

print(res)