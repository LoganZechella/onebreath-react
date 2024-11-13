export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  module: string;
  funcName: string;
  lineNo: number;
}

export interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  ip: string;
  user_agent: string;
}

export interface PerformanceMetric {
  timestamp: string;
  cpu_percent: number;
  memory_percent: number;
  response_time: number;
}

export interface ServerHealth {
  status: string;
  timestamp: string;
  active_connections: number;
} 