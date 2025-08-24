import unittest
import os
from unittest.mock import patch, MagicMock
from Chatbot import ChatbotAgent

# Backend/test_Chatbot.py

class TestChatbotAgent(unittest.TestCase):
    @patch('chromadb.PersistentClient')
    @patch('sentence_transformers.SentenceTransformer')
    @patch('langchain_openai.ChatOpenAI')
    def test_chatbot_initialization(self, mock_chat_openai, mock_sentence_transformer, mock_chroma_client):
        # Arrange
        test_api_key = "test_key_123"
        mock_collection = MagicMock()
        mock_chroma_client.return_value.get_or_create_collection.return_value = mock_collection
        
        # Act
        chatbot = ChatbotAgent(test_api_key)
        
        # Assert
        self.assertEqual(chatbot.CHROMA_PATH, "Lotr_Chroma_Database")
        self.assertEqual(chatbot.EMBEDDING_MODEL, "sentence-transformers/all-MiniLM-L6-v2")
        
        # Verify ChromaDB client initialization
        mock_chroma_client.assert_called_once_with(path="Lotr_Chroma_Database")
        mock_chroma_client.return_value.get_or_create_collection.assert_called_once_with(name="lotr_data")
        
        # Verify SentenceTransformer initialization
        mock_sentence_transformer.assert_called_once_with("sentence-transformers/all-MiniLM-L6-v2")
        
        # Verify ChatOpenAI initialization
        mock_chat_openai.assert_called_once_with(model="gpt-3.5-turbo", openai_api_key=test_api_key)
        
        # Verify prompt template setup
        self.assertIsNotNone(chatbot.prompt)
        self.assertIsNotNone(chatbot.chain)

if __name__ == '__main__':
    unittest.main()