import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './pages/dashboard';
import Completed from './pages/completed';
import DataViewer from './pages/data';
import Login from './pages/login';
import Layout from './components/layout/Layout';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/completed" element={
              <ProtectedRoute>
                <Completed />
              </ProtectedRoute>
            } />
            <Route path="/data" element={
              <ProtectedRoute>
                <DataViewer />
              </ProtectedRoute>
            } />
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;