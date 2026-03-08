import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SweatFixChatbot from './SweatFixChatbot'; // Render the new Chatbot prototype
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SweatFixChatbot />
  </StrictMode>,
);
