
export interface DroneState {
    isConnected: boolean;
    isArmed: boolean;
    throttle: number;
}

export interface LogEntry {
    timestamp: string;
    message: string;
    type: 'info' | 'error' | 'success' | 'cmd';
}
