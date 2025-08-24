import chromadb
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from sentence_transformers import SentenceTransformer

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")



class ChatbotAgent:
    def __init__(self, api_key):
        self.CHROMA_PATH="Lotr_Chroma_Database"
        self.EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"
        self.chroma_client = chromadb.PersistentClient(path=self.CHROMA_PATH)
        self.collection = self.chroma_client.get_or_create_collection(name="lotr_data")
        self.embedding_model = SentenceTransformer(self.EMBEDDING_MODEL)
        self.llm = ChatOpenAI(model="gpt-3.5-turbo", openai_api_key=api_key)

        self.system_prompt = """
        You are a knowledgeable assistant specialized in J.R.R. Tolkien's Middle-earth legendarium,
        including The Hobbit, The Lord of the Rings, The Silmarillion, Unfinished Tales, and related writings. 
        Your primary source of knowledge comes from the Chroma database provided to you.

        Context information (retrieved from the database):
        {context}

        User query:
        {query}

        Guidelines:
        - Always prioritize and rely on the provided context to answer the query. 
        - If the context does not contain sufficient information, say you do not know 
          instead of making up information. 
        - Keep your answers faithful to Tolkien's works and do not invent new lore. 
        - Provide clear, detailed, and accurate explanations grounded in the official texts. 
        - When possible, mention which book or story the information is from. 
        - Maintain a neutral, informative, and immersive tone suitable for Tolkien’s world.
        """

        self.prompt = ChatPromptTemplate.from_messages(
            [
                ("system", self.system_prompt),
                ("user", "{query}"),
            ]
        )
        self.chain = self.prompt | self.llm

    def get_context(self, query):
        query_embedding = self.embedding_model.encode(query, convert_to_numpy=True, show_progress_bar=False)
        results = self.collection.query(query_embedding, n_results=5)
        return results

    def run(self, query):
        context = self.get_context(query)
        response = self.chain.invoke({"query": query, "context": context})
        return response.content