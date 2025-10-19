"""
Example demonstrating the ignore_children feature with LangGraph agents.
This example shows how to ignore a parent agent while still tracking its child operations.

To run this example:
1. Set your LUNARY_PUBLIC_KEY environment variable
2. Set your OPENAI_API_KEY environment variable
3. Run: poetry run python examples/langchain/langgraph_ignore_children.py
"""

import os
from lunary import LunaryCallbackHandler
from lunary import IgnoreRule    


handler = LunaryCallbackHandler(
    app_id=os.getenv("LUNARY_PUBLIC_KEY"),  # Optional, will use env var if not provided
)

from langchain_openai import ChatOpenAI          
from langgraph.prebuilt import create_react_agent
from langgraph.graph import StateGraph, END, START
from langchain_core.runnables import RunnableConfig

# Initialize LLMs
llm = ChatOpenAI(model_name="gpt-5")
img_tool_llm = ChatOpenAI(model_name="gpt-5")

# Create agents
ImageProcessingAgent = create_react_agent(
    model=img_tool_llm,
    tools=[],
    prompt="You are ImageProcessingAgent. Describe the image the user sends.",
    name="ImageProcessingAgent",
)

SummariserAgent = create_react_agent(
    model=llm,
    tools=[],
    prompt="Summarise the image description you receive in one sentence."
)

# Define state
class ChatState(dict):
    pass

# Build graph
graph = StateGraph(dict)

graph.add_node("describe", ImageProcessingAgent)
graph.add_node("summarise", SummariserAgent)

graph.add_edge(START, "describe")
graph.add_edge("describe", "summarise")
graph.add_edge("summarise", END)

workflow = graph.compile()

# Configure callbacks
from uuid import uuid4

config = RunnableConfig(
    callbacks=[handler],
)

# Check if required environment variables are set
if not os.getenv("OPENAI_API_KEY"):
    print("Please set the OPENAI_API_KEY environment variable to run this example.")
    print("Example: export OPENAI_API_KEY='your-api-key'")
    exit(1)

if not os.getenv("LUNARY_PUBLIC_KEY"):
    print("Warning: LUNARY_PUBLIC_KEY not set. The example will run but won't send data to Lunary.")
    print("To enable tracking, set: export LUNARY_PUBLIC_KEY='your-public-key'")

# Interactive, concurrent runner
import asyncio
import sys


# Five predefined example messages (option 1 mirrors the original)
PREDEFINED_MESSAGES = [
    "Here is an image of a sunset over a beach.",
    "Here is an image of a snow-capped mountain at dawn.",
    "Here is an image of a bustling city skyline at night.",
    "Here is an image of a dense forest with a flowing river.",
    "Here is an image of golden sand dunes at sunrise.",
]


async def invoke_workflow(task_id: int, message: str):
    try:
        result = await workflow.ainvoke({"messages": message}, config=config)
        print(f"\n[Task {task_id}] Result:")
        print(result)
    except Exception as e:
        print(f"\n[Task {task_id}] Error: {e}")


async def main():
    print("Interactive LangGraph test (concurrent). Type a number to invoke.")
    print("- Enter 1-5 to choose a predefined message")
    print("- Enter q to quit")

    loop = asyncio.get_running_loop()
    tasks = set()
    counter = 0

    # Print menu once at start
    for idx, msg in enumerate(PREDEFINED_MESSAGES, start=1):
        print(f"  {idx}. {msg}")

    while True:
        try:
            # Read input without blocking the event loop
            user_input = await loop.run_in_executor(None, lambda: input("Select [1-5] or q> ").strip())
        except (EOFError, KeyboardInterrupt):
            print("\nExiting...")
            break

        if user_input.lower() in {"q", "quit", "exit"}:
            print("Goodbye!")
            break

        if not user_input.isdigit():
            print("Please enter a number between 1 and 5, or q to quit.")
            continue

        choice = int(user_input)
        if not (1 <= choice <= 5):
            print("Invalid choice. Pick a number between 1 and 5.")
            continue

        message = PREDEFINED_MESSAGES[choice - 1]
        counter += 1
        t = asyncio.create_task(invoke_workflow(counter, message))
        tasks.add(t)
        t.add_done_callback(lambda task: tasks.discard(task))
        print(f"Started Task {counter} with choice {choice}. You can start more.")

    # Optional: wait for in-flight tasks to finish before exiting
    if tasks:
        print(f"Waiting for {len(tasks)} running task(s) to finish...")
        await asyncio.gather(*tasks, return_exceptions=True)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nInterrupted. Exiting.")
