import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext.jsx';
import AppRoutes from './routes/AppRoutes';

export default function App({ children }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
