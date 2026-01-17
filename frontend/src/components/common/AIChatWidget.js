import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth } from '@/App';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, X, Minimize2, Maximize2, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from 'sonner';

const AIChatWidget = () => {
    const { user, token } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'system', content: "Hi! I'm your AI coding assistant. How can I help you today?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await axios.post(
                `${API}/ai/chat`,
                { message: userMessage.content },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const aiMessage = { role: 'assistant', content: response.data.response };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('AI Chat Error:', error);
            toast.error('Failed to get AI response');
            setMessages(prev => [...prev, { role: 'system', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-16 right-2 sm:bottom-20 sm:right-4 md:bottom-6 md:right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-2 sm:mb-4 w-[calc(100vw-1rem)] h-[calc(100vh-5rem)] 
                                   sm:w-[calc(100vw-2rem)] sm:h-[calc(100vh-6rem)]
                                   md:w-[420px] md:h-[650px]
                                   lg:w-[450px] lg:h-[700px]
                                   max-w-[95vw] max-h-[95vh]
                                   shadow-2xl rounded-xl overflow-hidden border border-gray-800 bg-[#1a1a1a] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-3 sm:p-4 bg-gradient-to-r from-primary/20 to-purple-500/20 border-b border-gray-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="p-1.5 sm:p-2 bg-primary/20 rounded-lg shrink-0">
                                    <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-white text-sm sm:text-base truncate">AI Assistant</h3>
                                    <p className="text-xs text-gray-400 truncate">Powered by Llama 3</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400 hover:text-white"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages */}
                        <ScrollArea className="flex-1 p-2 sm:p-3 md:p-4 bg-[#0a0a0a]/50 overflow-y-auto">
                            <div className="space-y-3 sm:space-y-4">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[90%] sm:max-w-[85%] md:max-w-[80%] rounded-lg p-2 sm:p-2.5 md:p-3 break-words overflow-wrap-anywhere ${msg.role === 'user'
                                                ? 'bg-primary text-white'
                                                : msg.role === 'system'
                                                    ? 'bg-gray-800 text-gray-300 text-xs sm:text-sm italic'
                                                    : 'bg-[#252525] text-gray-200'
                                                }`}
                                        >
                                            {msg.role === 'assistant' ? (
                                                <div className="markdown-content text-xs sm:text-sm overflow-x-auto">
                                                    <ReactMarkdown
                                                        components={{
                                                            code({ node, inline, className, children, ...props }) {
                                                                const match = /language-(\w+)/.exec(className || '');
                                                                return !inline && match ? (
                                                                    <div className="overflow-x-auto max-w-full">
                                                                        <SyntaxHighlighter
                                                                            style={vscDarkPlus}
                                                                            language={match[1]}
                                                                            PreTag="div"
                                                                            customStyle={{
                                                                                fontSize: '0.75rem',
                                                                                margin: 0,
                                                                                maxWidth: '100%'
                                                                            }}
                                                                        >
                                                                            {String(children).replace(/\n$/, '')}
                                                                        </SyntaxHighlighter>
                                                                    </div>
                                                                ) : (
                                                                    <code className={className || "bg-black/30 px-1 py-0.5 rounded font-mono text-xs"}>
                                                                        {children}
                                                                    </code>
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                <p className="text-xs sm:text-sm break-words overflow-wrap-anywhere">{msg.content}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="bg-[#252525] rounded-lg p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2">
                                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        {/* Input */}
                        <div className="p-2 sm:p-3 md:p-4 border-t border-gray-800 bg-[#1a1a1a] shrink-0">
                            <form onSubmit={handleSend} className="flex gap-1.5 sm:gap-2">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask anything..."
                                    className="bg-[#0a0a0a] border-gray-700 text-white text-sm flex-1 min-w-0"
                                    disabled={loading}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={!input.trim() || loading}
                                    className="bg-primary hover:bg-primary/90 h-9 w-9 sm:h-10 sm:w-10 shrink-0"
                                >
                                    <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isOpen && (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(true)}
                    className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-r from-primary to-purple-600 shadow-lg flex items-center justify-center text-white hover:shadow-primary/50 transition-shadow"
                >
                    <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
                </motion.button>
            )}
        </div>
    );
};

export default AIChatWidget;
