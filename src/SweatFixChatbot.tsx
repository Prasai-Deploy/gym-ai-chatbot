import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, MoreVertical, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Define the message structure
interface Message {
    id: string;
    text: string;
    sender: 'bot' | 'user';
    timestamp: string;
}

const INITIAL_MESSAGES: Message[] = [
    {
        id: '1',
        text: "Welcome to Sweat Fix Gym! I'm Coach Alex. Ready to crush your goals today?",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
];

const QUICK_ACTIONS = [
    "🏋️ Workout Plans",
    "🥗 Diet Chart",
    "💪 Membership",
    "📅 Book a Session"
];

export default function SweatFixChatbot() {
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [inputValue, setInputValue] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!inputValue.trim()) return;

        const newUserMessage: Message = {
            id: Date.now().toString(),
            text: inputValue,
            sender: 'user',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInputValue("");

        // Simulate bot response
        setTimeout(() => {
            const botResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: "Got it! Let me pull up that information for you. Keep pushing!",
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, botResponse]);
        }, 1000);
    };

    const handleQuickAction = (action: string) => {
        setInputValue(action);
    };

    return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-[#0a0a0a] text-white font-sans overflow-hidden sm:border-x sm:border-zinc-800 sm:shadow-2xl">
            {/* Header (Top Bar) */}
            <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-[#131313]/90 backdrop-blur-md border-b border-zinc-800 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-3 relative">
                    <div className="relative">
                        {/* Trainer Avatar */}
                        <img
                            src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=150&auto=format&fit=crop"
                            alt="Coach Alex"
                            className="w-11 h-11 rounded-full object-cover border-2 border-[#131313]"
                        />
                        {/* Online Status Indicator */}
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#39FF14] border-2 border-[#131313]"></span>
                    </div>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-widest text-zinc-100 drop-shadow-sm">
                            Sweat Fix Gym
                        </h1>
                        <p className="text-xs text-[#39FF14] font-medium tracking-wider">Coach Alex • Online</p>
                    </div>
                </div>
                <button className="p-2 text-zinc-400 hover:text-white transition-colors">
                    <Menu className="w-5 h-5" />
                </button>
            </header>

            {/* Chat Area (Main Body) */}
            <main className="flex-1 overflow-y-auto p-4 space-y-5 bg-gradient-to-b from-[#0a0a0a] to-[#111] scroll-smooth">
                <AnimatePresence initial={false}>
                    {messages.map((message) => {
                        const isBot = message.sender === 'bot';
                        return (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className={`flex w-full ${isBot ? 'justify-start' : 'justify-end'}`}
                            >
                                <div className={`flex flex-col max-w-[80%] ${isBot ? 'items-start' : 'items-end'}`}>
                                    <div
                                        className={`px-4 py-3 text-[15px] leading-relaxed shadow-sm ${isBot
                                                ? 'bg-[#1e1e1e] text-zinc-100 rounded-2xl rounded-tl-sm border border-zinc-800/50'
                                                : 'bg-[#ff5e00] text-white rounded-2xl rounded-tr-sm shadow-[0_4px_20px_rgba(255,94,0,0.25)]'
                                            }`}
                                    >
                                        {message.text}
                                    </div>
                                    <span className="text-[10px] text-zinc-500 mt-1.5 px-1 font-medium tracking-wider">
                                        {message.timestamp}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </main>

            {/* Quick Action Prompts */}
            <div className="bg-[#111] pt-3 pb-2 px-0 border-t border-zinc-900 border-opacity-50">
                <div className="flex overflow-x-auto gap-2 px-4 pb-2 no-scrollbar snap-x">
                    {QUICK_ACTIONS.map((action, index) => (
                        <button
                            key={index}
                            onClick={() => handleQuickAction(action)}
                            className="whitespace-nowrap flex-shrink-0 px-4 py-2 rounded-full bg-[#1a1a1a] text-sm font-medium text-zinc-300 border border-zinc-800 hover:bg-[#252525] hover:border-[#ff5e00] hover:text-white transition-all snap-start shadow-sm active:scale-95"
                        >
                            {action}
                        </button>
                    ))}
                </div>
            </div>

            {/* Input Field (Bottom Bar) */}
            <footer className="bg-[#131313] p-4 border-t border-zinc-800 z-20">
                <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-full p-1.5 pr-2 focus-within:ring-1 focus-within:ring-[#ff5e00] transition-all border border-zinc-800/60 shadow-inner">
                    <button className="p-2.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-full transition-colors">
                        <Paperclip className="w-5 h-5" />
                    </button>

                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask your fitness coach..."
                        className="flex-1 bg-transparent border-none focus:outline-none text-zinc-100 placeholder-zinc-500 text-[15px] px-1"
                    />

                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        className={`p-3 rounded-full flex items-center justify-center transition-all ${inputValue.trim()
                                ? 'bg-[#ff5e00] text-white shadow-[0_0_15px_rgba(255,94,0,0.4)] hover:bg-[#ff6a14] hover:scale-105'
                                : 'bg-zinc-800 text-zinc-500'
                            }`}
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </button>
                </div>
                {/* iOS safe area bottom padding simulation */}
                <div className="h-2 w-full"></div>
            </footer>
        </div>
    );
}
