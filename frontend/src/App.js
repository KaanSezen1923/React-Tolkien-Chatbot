
import './App.css';
import AuthForm from './components/AuthForm';
import Dashboard from './components/Dashboard';

function App() {
  const token = localStorage.getItem("token");
  console.log("Token:", token);

  return <div>{!token ? <AuthForm /> : <Dashboard />}</div>;
}

export default App;

