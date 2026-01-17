import React, { createContext, useState, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';
import '@/index.css';
import ErrorBoundary from '@/components/ErrorBoundary';

// Import pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import FeedPageNew from '@/pages/FeedPageNew';
import QuestionsPage from '@/pages/QuestionsPage';
import QuestionDetailPage from '@/pages/QuestionDetailPage';
import PostDetailPage from '@/pages/PostDetailPage';
import ProfilePage from '@/pages/ProfilePage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import MessagesPage from '@/pages/MessagesPage';
import SettingsPage from '@/pages/SettingsPage';
import AdminReportsPage from '@/pages/admin/AdminReportsPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import ProfileEditPage from '@/pages/ProfileEditPage';
import CreatePostPage from '@/pages/CreatePostPage';
import AdminPage from '@/pages/AdminPage';
import SearchPage from '@/pages/SearchPage';
import AIChatWidget from '@/components/common/AIChatWidget';
import TagPage from '@/pages/TagPage';
import ChallengesPage from '@/pages/ChallengesPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import LegalPage from '@/pages/LegalPage';
import Footer from '@/components/layout/Footer';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Context for authentication
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setToken(token);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="spinner w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-[#0a0a0a] text-white">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Protected Routes */}
              <Route path="/feed" element={<ProtectedRoute><FeedPageNew /></ProtectedRoute>} />
              <Route path="/questions" element={<ProtectedRoute><QuestionsPage /></ProtectedRoute>} />
              <Route path="/questions/:id" element={<ProtectedRoute><QuestionDetailPage /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
              <Route path="/profile/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/profile/edit" element={<ProtectedRoute><ProfileEditPage /></ProtectedRoute>} />
              <Route path="/create/post" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />
              <Route path="/posts/:id" element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
              <Route path="/posts/:id/edit" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} /> {/* Kept existing edit route */}
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/tags/:tagName" element={<ProtectedRoute><TagPage /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
              <Route path="/messages" element={
                <ProtectedRoute>
                  <MessagesPage />
                </ProtectedRoute>
              } />
              <Route path="/challenges" element={
                <ProtectedRoute>
                  <ChallengesPage />
                </ProtectedRoute>
              } />
              <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
              <Route path="/projects/:id" element={
                <ProtectedRoute>
                  <ProjectDetailPage />
                </ProtectedRoute>
              } />

              {/* Legal & Support Routes */}
              <Route path="/privacy" element={<LegalPage title="Privacy Policy" content="Your privacy is important to us..." />} />
              <Route path="/terms" element={<LegalPage title="Terms of Service" content="By using DevConnect, you agree to..." />} />
              <Route path="/help" element={<LegalPage title="Help Center" content="How can we help you today?" />} />
              <Route path="/contact" element={<LegalPage title="Contact Us" content="Reach out to us at support@devconnect.com" />} />
              <Route path="/support" element={<LegalPage title="Support" content="Get support for your issues here." />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute><AdminReportsPage /></ProtectedRoute>} />
            </Routes>
            <Toaster position="top-right" theme="dark" />
            <AIChatWidget />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
export { API, BACKEND_URL };