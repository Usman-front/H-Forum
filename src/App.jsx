import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Homepage from './components/Homepage';
import QuestionListings from './components/QuestionListings';
import QuestionDetail from './components/QuestionDetail';
import Login from './components/Login';
import AskQuestion from './components/AskQuestion';
import UserProfile from './components/UserProfile';
import EditProfile from './components/EditProfile';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// Component to redirect authenticated users away from login
const LoginRedirect = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }
  
  return <Login />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Login route without layout */}
          <Route path="/login" element={<LoginRedirect />} />
          
          {/* Routes with layout */}
          <Route path="/*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<QuestionListings />} />
                <Route path="/explore-topics" element={<Homepage />} />
                <Route path="/recent" element={<QuestionListings />} />
                <Route path="/my-topics" element={
                  <ProtectedRoute>
                    <QuestionListings />
                  </ProtectedRoute>
                } />

                <Route path="/ask-question" element={
                  <ProtectedRoute>
                    <AskQuestion />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                } />
                <Route path="/edit-profile" element={
                  <ProtectedRoute>
                    <EditProfile />
                  </ProtectedRoute>
                } />
                <Route path="/topics/:topicName" element={<QuestionListings />} />
                <Route path="/question/:id" element={<QuestionDetail />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App
