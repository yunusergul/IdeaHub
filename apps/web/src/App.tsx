import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useWsStore, setupEventRouting } from './stores/wsStore';
import { useAppStore } from './stores/appStore';
import { wsClient } from './lib/wsClient';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/Toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IdeaDetail from './pages/IdeaDetail';
import Settings from './pages/Settings';
import Surveys from './pages/Surveys';
import KanbanBoard from './pages/KanbanBoard';
import AuthCallback from './pages/AuthCallback';
import SurveyDetail from './pages/SurveyDetail';

// Setup event routing once at module level
let routingInitialized = false;
if (!routingInitialized) {
  setupEventRouting(useAppStore);
  routingInitialized = true;
}

function WsInitializer() {
  const isAuthenticated = useAuthStore(s => !!s.accessToken && !!s.user);
  const isLoading = useAuthStore(s => s.isLoading);
  const accessToken = useAuthStore(s => s.accessToken);
  const connect = useWsStore(s => s.connect);
  const disconnect = useWsStore(s => s.disconnect);
  const connectionState = useWsStore(s => s.connectionState);
  const connectedRef = useRef(false);

  useEffect(() => {
    // Wait for auth store to finish initial token refresh before connecting
    if (isLoading) return;

    if (isAuthenticated && accessToken) {
      connectedRef.current = true;
      connect(accessToken);
    } else if (connectedRef.current) {
      connectedRef.current = false;
      disconnect();
    }

    return () => {
      if (connectedRef.current) {
        connectedRef.current = false;
        disconnect();
      }
    };
  }, [isAuthenticated, isLoading, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update WS token when accessToken changes (after refresh)
  useEffect(() => {
    if (accessToken && connectionState === 'connected') {
      wsClient.updateToken(accessToken);
    }
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function AppInitializer() {
  const connectionState = useWsStore(s => s.connectionState);
  const fetchInitialData = useAppStore(s => s.fetchInitialData);
  const resetInitialized = useAppStore(s => s.resetInitialized);

  useEffect(() => {
    if (connectionState === 'connected') {
      fetchInitialData();
    } else if (connectionState === 'disconnected') {
      resetInitialized();
    } else if (connectionState === 'reconnecting') {
      // Reset so data is re-fetched when reconnect succeeds
      resetInitialized();
    }
  }, [connectionState]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <WsInitializer />
      <AppInitializer />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="idea/:id" element={<IdeaDetail />} />
          <Route path="settings" element={<Settings />} />
          <Route path="surveys" element={<Surveys />} />
          <Route path="surveys/:id" element={<SurveyDetail />} />
          <Route path="kanban" element={<KanbanBoard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
