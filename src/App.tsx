import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './app/AuthContext';
import { ThemeProvider, useTheme } from './app/ThemeContext';
import AppRoutes from './app/routes';

function AppToaster() {
  const { theme } = useTheme();
  return <Toaster position="top-right" richColors theme={theme} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      <AppToaster />
    </ThemeProvider>
  );
}
