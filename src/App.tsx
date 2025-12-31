import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PeerProvider } from './contexts/PeerContext';
import { HomePage } from './pages/HomePage';
import { SendPage } from './pages/SendPage';
import { ReceivePage } from './pages/ReceivePage';
import './App.css';

function App() {
  const basename = process.env.GITHUB_ACTIONS ? '/FileTransferApp' : '/';
  
  return (
    <BrowserRouter basename={basename}>
      <PeerProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/send" element={<SendPage />} />
          <Route path="/receive" element={<ReceivePage />} />
        </Routes>
      </PeerProvider>
    </BrowserRouter>
  );
}

export default App;
