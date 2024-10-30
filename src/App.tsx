import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Dashboard from './pages/dashboard/index';
import Completed from './pages/completed/index';
import DataViewer from './pages/data/index';
import Layout from './components/layout/Layout';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/completed" element={<Completed />} />
            <Route path="/data" element={<DataViewer />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;