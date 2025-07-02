from langchain_community.document_loaders import TextLoader
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import CharacterTextSplitter
from lunary import LunaryCallbackHandler
import lunary
import os

loader = TextLoader(os.path.join(os.path.dirname(__file__), "state_of_the_union.txt"))

documents = loader.load()
text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
texts = text_splitter.split_documents(documents)
embeddings = OpenAIEmbeddings()
vectorstore = FAISS.from_documents(texts, embeddings)
retriever = vectorstore.as_retriever()

thread =  lunary.open_thread()
question = "what did the president say about ketanji brown jackson?"
msg_id = thread.track_message({"role": "user", "content": question})

with lunary.parent(msg_id):
    docs = retriever.invoke(question, config={"callbacks": [LunaryCallbackHandler()], "metadata": {"a": 1}})
    print(docs)


