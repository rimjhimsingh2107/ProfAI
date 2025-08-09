import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.tsx';
import LoginPage from './components/LoginPage.tsx';
import ChatInterface from './components/ChatInterface.tsx';
import Dashboard from './components/Dashboard.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';
import './index.css';

function AppRoutes() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={currentUser ? <Navigate to="/chat" /> : <LoginPage />} 
      />
      <Route 
        path="/chat" 
        element={currentUser ? <ChatInterface /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/dashboard" 
        element={currentUser ? <Dashboard /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/" 
        element={<Navigate to={currentUser ? "/chat" : "/login"} />} 
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
