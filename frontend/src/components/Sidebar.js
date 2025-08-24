import React, { useState } from "react";
import "../styles/Sidebar.css";
import { useChatSessions } from "../hooks/useChatSessions";

const Sidebar = ({ onNewChat, onLogout, onSelectSession, currentSessionId }) => {
  const { 
    sessions, 
    loading, 
    error, 
    createNewSession, 
    deleteSession,
    loadChatSessions 
  } = useChatSessions();
  
  const [deletingSessionId, setDeletingSessionId] = useState(null);

  const handleNewChat = async () => {
    const sessionId = await createNewSession();
    if (sessionId) {
      onNewChat(sessionId);
    }
  };

  const handleSelectSession = async (sessionId) => {
    if (onSelectSession) {
      await onSelectSession(sessionId);
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation(); // Parent click event'ini engelle
    
    if (window.confirm("Bu sohbeti silmek istediğinizden emin misiniz?")) {
      setDeletingSessionId(sessionId);
      const success = await deleteSession(sessionId);
      if (success) {
        // Eğer silinen session şu anda aktifse, yeni chat başlat
        if (currentSessionId === sessionId) {
          await handleNewChat();
        }
      }
      setDeletingSessionId(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        return "Today";
      } else if (diffDays === 2) {
        return "Yesterday";
      } else if (diffDays <= 7) {
        return `${diffDays - 1} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return "Unknown";
    }
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return "New Chat";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="sidebar-container">
      {/* Header Buttons */}
      <div className="sidebar-buttons">
        <button className="sidebar-btn new-chat" onClick={handleNewChat}>
          🆕 New Chat
        </button>
        <button className="sidebar-btn logout" onClick={onLogout}>
          🚪 Logout
        </button>
      </div>

      {/* Chat History */}
      <div className="chat-history-section">
        <h3 className="history-title">📚 Chat History</h3>
        
        {error && (
          <div className="error-message">
            <p>Error: {error}</p>
            <button onClick={loadChatSessions} className="retry-btn">
              Retry
            </button>
          </div>
        )}
        
        {loading && <div className="loading">Loading chats...</div>}
        
        <div className="sessions-list">
          {sessions.length === 0 && !loading ? (
            <div className="no-sessions">
              <p>No chat history yet</p>
              <p className="hint">Start a new chat to begin!</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div 
                key={session.session_id}
                className={`session-item ${currentSessionId === session.session_id ? 'active' : ''}`}
                onClick={() => handleSelectSession(session.session_id)}
              >
                <div className="session-content">
                  <div className="session-preview">
                    {truncateText(session.preview)}
                  </div>
                  <div className="session-meta">
                    <span className="session-date">
                      {formatDate(session.last_message_time)}
                    </span>
                    <span className="message-count">
                      {session.message_count} messages
                    </span>
                  </div>
                </div>
                
                <button
                  className={`delete-btn ${deletingSessionId === session.session_id ? 'deleting' : ''}`}
                  onClick={(e) => handleDeleteSession(e, session.session_id)}
                  disabled={deletingSessionId === session.session_id}
                  title="Delete chat"
                >
                  {deletingSessionId === session.session_id ? "..." : "🗑️"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <p>© 2025 Tolkien Chatbot</p>
      </div>
    </div>
  );
};

export default Sidebar;