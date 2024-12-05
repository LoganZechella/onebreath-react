import { useState, useEffect } from 'react';
import { adminService } from '../../services/admin';
import { LogEntry, RequestLog, ServerHealth } from '../../types/admin';
import { auth } from '../../services/firebase';

export default function AdminDashboard() {
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [errorLogs, setErrorLogs] = useState<LogEntry[]>([]);
  const [requestLogs, setRequestLogs] = useState<RequestLog[]>([]);
  const [activeConnections, setActiveConnections] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      const tokenResult = await user.getIdTokenResult(true);
      if (!tokenResult.claims.admin) {
        throw new Error('User does not have admin privileges');
      }
      return tokenResult;
    };

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Verify admin status first
        await checkAdminStatus();

        // Connect to socket and fetch data
        await adminService.connect();

        const [healthData, errors, requests] = await Promise.all([
          adminService.getServerHealth(),
          adminService.getErrorLogs(),
          adminService.getRequestLogs()
        ]);

        setHealth(healthData);
        setErrorLogs(errors);
        setRequestLogs(requests);
        setActiveConnections(healthData?.active_connections || 0);
      } catch (err) {
        console.error('Admin dashboard error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch admin data';
        setError(errorMessage);
        setErrorLogs([]);
        setRequestLogs([]);
      } finally {
        setLoading(false);
      }
    };

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchData();
      } else {
        setError('Please sign in with an admin account');
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      adminService.disconnect();
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Server Health */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Server Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-2">Status</h3>
            <p className={`text-lg ${health?.status === 'healthy' ? 'text-green-500' : 'text-red-500'}`}>
              {health?.status || 'Unknown'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-2">Active Connections</h3>
            <p className="text-lg">{activeConnections}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-2">Last Updated</h3>
            <p className="text-lg">
              {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>
      </section>

      {/* Error Logs */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Error Logs</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {errorLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${log.level === 'ERROR' ? 'bg-red-100 text-red-800' : 
                          log.level === 'WARNING' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-blue-100 text-blue-800'}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {log.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.module}:{log.lineNo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Request Logs */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Request Logs</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Path
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {requestLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${log.method === 'GET' ? 'bg-green-100 text-green-800' :
                          log.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                          log.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                          log.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {log.path}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.ip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
} 