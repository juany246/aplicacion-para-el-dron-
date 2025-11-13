import React, { useState, useRef, useCallback } from 'react';
import { BluetoothService } from './services/bluetoothService';
import { ControlPad } from './components/ControlPad';
import { ActionButton } from './components/ActionButton';
import { StatusDisplay } from './components/StatusDisplay';
import { JoystickIcon, PowerIcon, BluetoothIcon, CalibrateIcon, ArmIcon, DisarmIcon } from './components/Icons';
import { DroneState, LogEntry } from './types';

const App: React.FC = () => {
    const [droneState, setDroneState] = useState<DroneState>({
        isConnected: false,
        isArmed: false,
        throttle: 0,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [statusText, setStatusText] = useState("Desconectado");

    const bluetoothServiceRef = useRef<BluetoothService | null>(null);

    const addLog = (message: string, type: 'info' | 'error' | 'success' | 'cmd' = 'info') => {
        const newLog: LogEntry = {
            timestamp: new Date().toLocaleTimeString(),
            message,
            type,
        };
        setLogs(prevLogs => [newLog, ...prevLogs.slice(0, 99)]);
    };

    const handleConnect = async () => {
        if (droneState.isConnected && bluetoothServiceRef.current) {
            await bluetoothServiceRef.current.disconnect();
            setDroneState({ isConnected: false, isArmed: false, throttle: 0 });
            setStatusText("Desconectado");
            addLog("Bluetooth desconectado.", "info");
            bluetoothServiceRef.current = null;
        } else {
            setStatusText("Conectando...");
            addLog("Buscando dispositivo Bluetooth...");
            try {
                const service = new BluetoothService();
                await service.connect();
                bluetoothServiceRef.current = service;
                setDroneState(prevState => ({ ...prevState, isConnected: true }));
                setStatusText("Conectado");
                addLog("¡Dispositivo Bluetooth conectado con éxito!", "success");
            } catch (error) {
                const errorMessage = (error as Error).message;
                setStatusText("Falló");
                addLog(`Conexión fallida: ${errorMessage}`, "error");
                console.error(error);
            }
        }
    };

    const sendCommand = useCallback(async (command: string) => {
        if (droneState.isConnected && bluetoothServiceRef.current) {
            try {
                await bluetoothServiceRef.current.sendCommand(command);
                addLog(`Comando enviado: '${command}'`, 'cmd');
                // Optimistically update state for immediate feedback
                if (command === 'r') setDroneState(s => ({ ...s, isArmed: true }));
                if (command === 'f') setDroneState(s => ({ ...s, isArmed: false, throttle: 0 }));
                if (command === '+') setDroneState(s => ({ ...s, throttle: Math.min(s.throttle + 10, 255) }));
                if (command === '-') setDroneState(s => ({ ...s, throttle: Math.max(s.throttle - 10, 0) }));
                if (command === 'x') setDroneState(s => ({ ...s, throttle: 0 }));
            } catch (error) {
                addLog(`Fallo al enviar comando '${command}'`, "error");
            }
        } else {
            addLog("No se puede enviar comando: No conectado.", "error");
        }
    }, [droneState.isConnected]);

    return (
        <div className="w-screen h-screen bg-gray-900 text-cyan-300 font-mono flex flex-col overflow-hidden">
            <main className="flex-1 flex flex-row justify-evenly items-center gap-2 p-1 sm:gap-4 sm:p-4 lg:p-8 h-full">
                {/* Left Panel: Altitude / Yaw */}
                <div className="flex flex-col items-center space-y-2 md:space-y-4">
                    <h2 className="text-sm sm:text-lg font-bold tracking-wider text-center">ALTITUD / GIRO</h2>
                    <ControlPad
                        onUp={() => sendCommand('+')}
                        onDown={() => sendCommand('-')}
                        onLeft={() => sendCommand('q')}
                        onRight={() => sendCommand('e')}
                        upLabel="Subir"
                        downLabel="Bajar"
                        leftLabel="Giro I"
                        rightLabel="Giro D"
                    />
                </div>

                {/* Center Panel: Status & Actions */}
                <div className="flex flex-col items-center justify-around h-full flex-shrink w-auto min-w-[190px] sm:min-w-[280px] py-2">
                    <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                            <JoystickIcon className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" />
                            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-wider">CONTROL DRON</h1>
                        </div>
                         <ActionButton
                            onClick={handleConnect}
                            className={`w-full max-w-[200px] mt-4 ${droneState.isConnected ? 'bg-red-500 hover:bg-red-600' : 'bg-cyan-500 hover:bg-cyan-600'}`}
                        >
                            <BluetoothIcon className="w-5 h-5 mr-2" />
                            {droneState.isConnected ? 'Desconectar' : 'Conectar'}
                        </ActionButton>
                    </div>

                    <StatusDisplay state={droneState} statusText={statusText} />

                    <div className="w-full">
                         <h2 className="text-base sm:text-lg font-bold tracking-wider text-center mb-2">ACCIONES</h2>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            <ActionButton onClick={() => sendCommand('r')} disabled={!droneState.isConnected || droneState.isArmed} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600">
                                <ArmIcon className="w-5 h-5 mr-2" /> Prender
                            </ActionButton>
                            <ActionButton onClick={() => sendCommand('f')} disabled={!droneState.isConnected || !droneState.isArmed} className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600">
                                <DisarmIcon className="w-5 h-5 mr-2" /> Apagar
                            </ActionButton>
                            <ActionButton onClick={() => sendCommand('c')} disabled={!droneState.isConnected || droneState.isArmed} className="col-span-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600">
                                <CalibrateIcon className="w-5 h-5 mr-2" /> Calibrar
                            </ActionButton>
                            <ActionButton onClick={() => sendCommand('x')} disabled={!droneState.isConnected || !droneState.isArmed} className="col-span-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600">
                                <PowerIcon className="w-5 h-5 mr-2" /> EMERGENCIA
                            </ActionButton>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Pitch / Roll */}
                <div className="flex flex-col items-center space-y-2 md:space-y-4">
                    <h2 className="text-sm sm:text-lg font-bold tracking-wider text-center">INCLINACIÓN / LADEO</h2>
                    <ControlPad
                        onUp={() => sendCommand('w')}
                        onDown={() => sendCommand('s')}
                        onLeft={() => sendCommand('a')}
                        onRight={() => sendCommand('d')}
                        upLabel="Adelante"
                        downLabel="Atrás"
                        leftLabel="Ladeo I"
                        rightLabel="Ladeo D"
                    />
                </div>
            </main>
        </div>
    );
};

export default App;
