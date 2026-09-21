import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';

export default function App({ children }) {
  return (
    <BrowserRouter>
      {children}
      <AppRoutes />
    </BrowserRouter>
  );
}
