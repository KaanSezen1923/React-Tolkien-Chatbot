import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Chatbot from "./Chatbot";

const Dashboard = () => {
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [chatKey, setChatKey] = useState(Date.now());

  // Yeni chat başlat
  const handleNewChat = (sessionId = null) => {
    setCurrentSessionId(sessionId);
    setChatKey(Date.now()); // Chatbot'u yeniden render et
  };

  // Mevcut sohbeti seç
  const handleSelectSession = async (sessionId) => {
    setCurrentSessionId(sessionId);
    setChatKey(Date.now()); // Chatbot'u yeniden render et
  };

  // Session güncellendiğinde (yeni session oluşturulduğunda)
  const handleSessionUpdate = (sessionId) => {
    if (sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.reload();
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar 
        onNewChat={handleNewChat}
        onLogout={handleLogout}
        onSelectSession={handleSelectSession}
        currentSessionId={currentSessionId}
      />
      <div style={{ flex: 1, padding: "20px" }}>
        <Chatbot 
          key={chatKey}
          sessionId={currentSessionId}
          onSessionUpdate={handleSessionUpdate}
        />
      </div>
    </div>
  );
};

export default Dashboard;
