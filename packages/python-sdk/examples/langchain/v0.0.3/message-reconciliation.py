from graph_rag_example_helpers.datasets.animals import fetch_documents
animals = fetch_documents()

from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

from langchain_core.vectorstores import InMemoryVectorStore

vector_store = InMemoryVectorStore.from_documents(
    documents=animals,
    embedding=embeddings,
)


from graph_retriever.strategies import Eager
from langchain_graph_retriever import GraphRetriever

traversal_retriever = GraphRetriever(
    store = vector_store,
    edges = [("habitat", "habitat"), ("origin", "origin")],
    strategy = Eager(k=5, start_k=1, max_depth=2),
)


results = traversal_retriever.invoke("what animals could be found near a capybara?")


from langchain.chat_models import init_chat_model

llm = init_chat_model("gpt-4o-mini", model_provider="openai")

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableConfig
import lunary

handler = lunary.LunaryCallbackHandler()

prompt = ChatPromptTemplate.from_template(
"""Answer the question based only on the context provided.

Context: {context}

Question: {question}"""
)

def format_docs(docs):
    return "\n\n".join(f"text: {doc.page_content} metadata: {doc.metadata}" for doc in docs)

chain = (
    {"context": traversal_retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

thread1 = lunary.open_thread()
thread2 = lunary.open_thread()




async def main():
  msg_id = thread1.track_message({"role": "user", "content": "what animals could be found near a capybar"})
  with lunary.parent(msg_id):
    res = await chain.ainvoke("what animals could be found near a capybara?", RunnableConfig({"callbacks": [handler]}))
    msg_id = thread1.track_message({"role": "assistant", "content": res})

def main2():
  msg_id = thread2.track_message({"role": "user", "content": "what animals could be found near a capybar"})
  with lunary.parent(msg_id):
    res = chain.invoke("what animals could be found near a capybara?", RunnableConfig({"callbacks": [handler]}))
    msg_id = thread2.track_message({"role": "assistant", "content": res})


import asyncio
asyncio.run(main())
main2()


