import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { HomePage } from './pages/HomePage';
import { GamePage } from './pages/GamePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <HomePage />
            </AuthGuard>
          }
        />
        <Route
          path="/game/:id"
          element={
            <AuthGuard>
              <GamePage />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
