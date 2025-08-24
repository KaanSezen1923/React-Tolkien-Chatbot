import React, { useState, useEffect } from "react";
import "../styles/Chatbot.css";

const Chatbot = ({ sessionId, onSessionUpdate }) => {
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);

  // Session değiştiğinde chat history'yi yükle
  useEffect(() => {
    if (sessionId) {
      setCurrentSessionId(sessionId);
      loadSessionMessages(sessionId);
    } else {
      // Yeni chat için history'yi temizle
      setChatHistory([]);
      setCurrentSessionId(null);
    }
  }, [sessionId]);

  // Session mesajlarını yükle
  const loadSessionMessages = async (sessionId) => {
    if (!sessionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("You must be logged in to use the chatbot.");
      }

      const response = await fetch(
        `http://localhost:8000/sessions/${sessionId}/messages`,
        {
          method: "GET",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setChatHistory(data.messages || []);
      
    } catch (err) {
      setError(`Error loading chat history: ${err.message}`);
      console.error("Failed to load session messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { 
      type: "user", 
      content: query, 
      timestamp: new Date().toISOString() 
    };
    
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("You must be logged in to use the chatbot.");
      }

      // Session ID parametresini URL'e ekle
      const url = currentSessionId 
        ? `http://localhost:8000/ask/${encodeURIComponent(query)}?session_id=${currentSessionId}`
        : `http://localhost:8000/ask/${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Eğer yeni session oluşturulduysa, session ID'yi güncelle
      if (data.session_id && !currentSessionId) {
        setCurrentSessionId(data.session_id);
        if (onSessionUpdate) {
          onSessionUpdate(data.session_id);
        }
      }
      
      const botMessage = {
        type: "bot",
        content: data.text,
        image: data.image,
        timestamp: new Date().toISOString()
      };

      const finalHistory = [...updatedHistory, botMessage];
      setChatHistory(finalHistory);
      
    } catch (err) {
      setError(`Error: ${err.message}`);
      console.error("API call failed:", err);
      
      // Hata durumunda kullanıcı mesajını history'den çıkar
      setChatHistory(chatHistory);
    } finally {
      setLoading(false);
      setQuery("");
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return "";
    }
  };

  const getWelcomeMessage = () => {
    if (currentSessionId) {
      return "Continue your conversation with the Tolkien chatbot";
    }
    return "Start a new conversation with the Tolkien chatbot!";
  };

  return (
    <div className="chatbot-page">
      {/* Header */}
      <div className="chat-header">
        <h2>🧙‍♂️ Tolkien Chatbot</h2>
        <div className="session-info">
          {currentSessionId ? (
            <span className="session-indicator active">
              Session Active
            </span>
          ) : (
            <span className="session-indicator">
              New Chat
            </span>
          )}
        </div>
      </div>

      {/* Chat History */}
      <div className="chat-history">
        {chatHistory.length === 0 && !loading ? (
          <div className="welcome-section">
            <div className="welcome-icon">🧙‍♂️</div>
            <h3>Welcome to Tolkien Chatbot!</h3>
            <p className="welcome-text">{getWelcomeMessage()}</p>
            <div className="example-questions">
              <p>Try asking about:</p>
              <ul>
                <li>Characters from Middle-earth</li>
                <li>The history of the Ring</li>
                <li>Tolkien's writing process</li>
                <li>Languages in Middle-earth</li>
              </ul>
            </div>
          </div>
        ) : (
          chatHistory.map((message, index) => (
            <div key={index} className={`message ${message.type}`}>
              <div className="message-content">
                <div className="message-header">
                  <span className={`message-sender ${message.type}`}>
                    {message.type === "user" ? "You" : "Tolkien Bot"}
                  </span>
                  {message.timestamp && (
                    <span className="message-timestamp">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  )}
                </div>
                <p className="message-text">{message.content}</p>
                {message.image && (
                  <div className="generated-image">
                    <img
                      src={message.image}
                      alt="Generated response"
                      onError={(e) => {
                        e.target.style.display = "none";
                        console.error("Image failed to load:", message.image);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {loading && (
          <div className="message bot">
            <div className="message-content">
              <div className="loading-msg">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                Tolkien Bot is thinking...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Input Area */}
      <form className="chat-input-area" onSubmit={handleSubmit}>
        <div className="input-container">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask me anything about Tolkien's world..."
            className="chat-input"
            disabled={loading}
          />
          <button
            type="submit"
            className="chat-submit"
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <span className="button-loading">⏳</span>
            ) : (
              <span className="send-icon">➤</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chatbot;