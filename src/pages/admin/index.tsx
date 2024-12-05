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
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Ensure user is authenticated before making requests
        const user = auth.currentUser;
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Try to establish socket connection first
        await adminService.connect();

        const [healthData, errors, requests] = await Promise.all([
          adminService.getServerHealth(),
          adminService.getErrorLogs(),
          adminService.getRequestLogs()
        ]);

        setHealth(healthData);
        setErrorLogs(Array.isArray(errors) ? errors : []);
        setRequestLogs(Array.isArray(requests) ? requests : []);
        setActiveConnections(healthData.active_connections);
      } catch (err) {
        console.error('Admin dashboard error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch admin data');
        setErrorLogs([]);
        setRequestLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      adminService.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
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