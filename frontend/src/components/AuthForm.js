import React, { useState } from "react";
import "../styles/AuthForm.css"

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const url = isLogin
        ? "http://localhost:8000/login"
        : "http://localhost:8000/signup";

      const payload = isLogin
        ? { email, password }
        : { username, email, password };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Something went wrong");
      }

      if (isLogin) {
        setMessage({ type: "success", text: "✅ Login successful!" });
        localStorage.setItem("token", data.idToken);
        
        // Login başarılı olduktan sonra sayfayı yenile
        setTimeout(() => {
          window.location.reload();
        }, 1000); // 1 saniye sonra sayfa yenilenir
        
      } else {
        setMessage({ type: "success", text: "✅ Signup successful! You can login now." });
        // Signup başarılı olduktan sonra otomatik olarak login formuna geç
        setTimeout(() => {
          setIsLogin(true);
          setMessage(null);
          setUsername("");
          setEmail("");
          setPassword("");
        }, 2000);
      }
    } catch (err) {
      setMessage({ type: "error", text: `❌ ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>{isLogin ? "Login" : "Signup"}</h2>

      {message && (
        <p className={`auth-message ${message.type}`}>
          {message.text}
        </p>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        {!isLogin && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : isLogin ? "Login" : "Signup"}
        </button>
      </form>

      <p className="auth-toggle">
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <button 
          onClick={() => {
            setIsLogin(!isLogin);
            setMessage(null);
            setUsername("");
            setEmail("");
            setPassword("");
          }}
        >
          {isLogin ? "Signup here" : "Login here"}
        </button>
      </p>
    </div>
  );
};

export default AuthForm;
