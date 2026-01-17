import React, { useState, useRef, useEffect } from 'react';
import { useAuth, API } from '@/App';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const AIChatWidget = () => {
    const { user, token } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hi! I\'m your AI coding assistant. How can I help you today?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Use token if available, though endpoint might be public depending on backend config
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

            const response = await axios.post(`${API}/ai/chat`, {
                message: userMessage.content
            }, config);

            const aiMessage = { role: 'assistant', content: response.data.response };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('AI Chat Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again later.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Only show for logged in users
    if (!user) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[99999] flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-[#1a1a1a] border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-800 bg-[#0a0a0a] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-teal-500 rounded-lg flex items-center justify-center">
                                    <Bot className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white text-sm">AI Assistant</h3>
                                    <p className="text-xs text-gray-400 flex items-center gap-1">
                                        <Sparkles className="h-3 w-3 text-yellow-500" />
                                        Powered by Gemini
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={() => setIsOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Messages */}
                        <ScrollArea className="flex-1 p-4 bg-[#0a0a0a]/50">
                            <div className="space-y-4">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                    >
                                        <Avatar className="h-8 w-8 mt-1">
                                            {msg.role === 'assistant' ? (
                                                <div className="w-full h-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center">
                                                    <Bot className="h-5 w-5 text-white" />
                                                </div>
                                            ) : (
                                                <>
                                                    <AvatarImage src={user?.avatar} />
                                                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                                </>
                                            )}
                                        </Avatar>
                                        <div
                                            className={`rounded-2xl p-3 text-sm max-w-[80%] ${msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-[#2a2a2a] text-gray-100'
                                                }`}
                                        >
                                            {msg.role === 'assistant' ? (
                                                <ReactMarkdown
                                                    components={{
                                                        code({ node, inline, className, children, ...props }) {
                                                            const match = /language-(\w+)/.exec(className || '');
                                                            return !inline && match ? (
                                                                <SyntaxHighlighter
                                                                    style={vscDarkPlus}
                                                                    language={match[1]}
                                                                    PreTag="div"
                                                                    {...props}
                                                                >
                                                                    {String(children).replace(/\n$/, '')}
                                                                </SyntaxHighlighter>
                                                            ) : (
                                                                <code className={className} {...props}>
                                                                    {children}
                                                                </code>
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-teal-500 rounded-full flex items-center justify-center mt-1">
                                            <Bot className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="bg-[#2a2a2a] rounded-2xl p-3 flex items-center">
                                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                        </div>
                                    </div>
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        {/* Input */}
                        <div className="p-4 border-t border-gray-800 bg-[#0a0a0a]">
                            <div className="flex gap-2">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask anything..."
                                    className="bg-[#1a1a1a] border-gray-700 text-white focus-visible:ring-sky-500"
                                    disabled={isLoading}
                                />
                                <Button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    size="icon"
                                    className="bg-sky-600 hover:bg-sky-700 text-white"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${isOpen
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:shadow-sky-500/25'
                    }`}
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
            </motion.button>
        </div>
    );
};

export default AIChatWidget;
