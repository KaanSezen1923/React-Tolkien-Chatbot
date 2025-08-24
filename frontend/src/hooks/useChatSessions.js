// hooks/useChatSessions.js
import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8000';

export const useChatSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };
  };

  // Tüm sohbetleri yükle
  const loadChatSessions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(`Error loading sessions: ${err.message}`);
      console.error("Failed to load chat sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  // Yeni sohbet oluştur
  const createNewSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/new`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      await loadChatSessions(); // Listeyi yenile
      return data.session_id;
    } catch (err) {
      setError(`Error creating new session: ${err.message}`);
      console.error("Failed to create new session:", err);
      return null;
    }
  };

  // Sohbeti sil
  const deleteSession = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await loadChatSessions(); // Listeyi yenile
      return true;
    } catch (err) {
      setError(`Error deleting session: ${err.message}`);
      console.error("Failed to delete session:", err);
      return false;
    }
  };

  // Belirli bir sohbetin mesajlarını yükle
  const loadSessionMessages = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (err) {
      setError(`Error loading session messages: ${err.message}`);
      console.error("Failed to load session messages:", err);
      return [];
    }
  };

  // Sohbeti güncelle
  const updateSession = async (sessionId, messages) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await loadChatSessions(); // Listeyi yenile
      return true;
    } catch (err) {
      setError(`Error updating session: ${err.message}`);
      console.error("Failed to update session:", err);
      return false;
    }
  };

  useEffect(() => {
    loadChatSessions();
  }, []);

  return {
    sessions,
    loading,
    error,
    loadChatSessions,
    createNewSession,
    deleteSession,
    loadSessionMessages,
    updateSession,
  };
};