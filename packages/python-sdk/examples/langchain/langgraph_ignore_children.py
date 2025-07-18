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

# Configure ignore rules - ignore ImageProcessingAgent but track its children
AgentIgnoreList = [
    IgnoreRule(type="agent", name=["ImageProcessingAgent"], ignore_children=True)
]

handler = LunaryCallbackHandler(
    app_id=os.getenv("LUNARY_PUBLIC_KEY"),  # Optional, will use env var if not provided
    ignore=AgentIgnoreList,
)

from langchain_openai import ChatOpenAI          
from langgraph.prebuilt import create_react_agent
from langgraph.graph import StateGraph, END, START
from langchain_core.runnables import RunnableConfig

# Initialize LLMs
llm = ChatOpenAI(model_name="gpt-4o")
img_tool_llm = ChatOpenAI(model_name="gpt-4o")

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

# Run the workflow
print("Running workflow with ignore_children example...")
result = workflow.invoke(
    {"messages": "Here is an image of a sunset over a beach."},
    config=config
)

print("\nResult:")
print(result)
print("\nNote: ImageProcessingAgent was ignored but its child operations were tracked in Lunary.")