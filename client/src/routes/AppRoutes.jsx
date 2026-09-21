import { Routes, Route } from 'react-router-dom';
import SetupPage from '../pages/SetupPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SetupPage />} />
    </Routes>
  );
}
