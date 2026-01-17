import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Code, CheckCircle, XCircle, Play, ThumbsUp, Share2, MessageSquare, RotateCcw } from 'lucide-react';
import CodeBlock from '@/components/common/CodeBlock';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import confetti from 'canvas-confetti';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css'; // Dark theme
import { formatDate } from '@/lib/utils';

const ChallengesPage = () => {
    const { user, token } = useAuth();
    const [challenge, setChallenge] = useState(null);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [activeTab, setActiveTab] = useState('problem');
    const [solutions, setSolutions] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        if (challenge) {
            fetchSolutions();
        }
    }, [challenge]);

    useEffect(() => {
        if (activeTab === 'leaderboard') {
            fetchLeaderboard();
        }
    }, [activeTab]);

    useEffect(() => {
        fetchDailyChallenge();
    }, []);

    const fetchDailyChallenge = async () => {
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const response = await axios.get(`${API}/challenges/daily`, { headers });
            setChallenge(response.data);
            setCode(response.data.starterCode || '');
        } catch (error) {
            toast.error('Failed to load daily challenge');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!user) {
            toast.error('Please login to submit solutions');
            return;
        }

        setSubmitting(true);
        setResult(null);

        try {
            const response = await axios.post(`${API}/challenges/${challenge.id}/submit`, {
                code
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setResult(response.data);

            if (response.data.success) {
                toast.success(`🎉 Correct! You earned ${response.data.points} points.`);
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                // Refresh challenge to show solved status
                fetchDailyChallenge();
            } else {
                toast.error('Test cases failed. Try again!');
            }
        } catch (error) {
            toast.error('Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    const fetchSolutions = async () => {
        try {
            const response = await axios.get(`${API}/challenges/${challenge.id}/solutions`);
            setSolutions(response.data);
        } catch (error) {
            console.error("Failed to fetch solutions", error);
        }
    };

    const handleShare = async () => {
        if (!result?.success) return;
        try {
            await axios.post(`${API}/challenges/${challenge.id}/share`, { code }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Solution shared with community!');
            fetchSolutions();
            setActiveTab('solutions');
        } catch (error) {
            toast.error('Failed to share solution');
        }
    };

    const handleVote = async (solutionId) => {
        try {
            await axios.post(`${API}/solutions/${solutionId}/vote`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchSolutions();
        } catch (error) {
            toast.error('Failed to vote');
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const response = await axios.get(`${API}/leaderboard`);
            setLeaderboard(response.data);
        } catch (error) {
            console.error("Failed to fetch leaderboard", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a]">
                <Navbar />
                <div className="flex items-center justify-center h-96">
                    <div className="spinner w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Code className="h-8 w-8 text-primary" />
                            Daily Coding Challenge
                        </h1>
                        <p className="text-gray-400 mt-2">Solve the daily problem to earn points and badges.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-sm text-gray-400">Streak</div>
                            <div className="text-xl font-bold text-white">🔥 {user?.streak || 0} Days</div>
                        </div>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="bg-[#1a1a1a] mb-8 border border-gray-800">
                        <TabsTrigger value="problem" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Problem</TabsTrigger>
                        <TabsTrigger value="solutions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Community Solutions</TabsTrigger>
                        <TabsTrigger value="leaderboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Leaderboard</TabsTrigger>
                    </TabsList>

                    <TabsContent value="problem">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Problem Description */}
                            <div className="space-y-6">
                                <Card className="bg-[#1a1a1a] border-gray-800">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-2xl text-white mb-2">{challenge?.title}</CardTitle>
                                                <div className="flex gap-2">
                                                    <Badge className={
                                                        challenge?.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500' :
                                                            challenge?.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' :
                                                                'bg-red-500/10 text-red-500'
                                                    }>
                                                        {challenge?.difficulty}
                                                    </Badge>
                                                    <Badge variant="outline" className="border-primary text-primary">
                                                        {challenge?.points} Points
                                                    </Badge>
                                                    {challenge?.solved && (
                                                        <Badge className="bg-green-500 text-white">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Solved
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                                            {challenge?.description}
                                        </p>

                                        <div className="mt-6">
                                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Example Test Cases</h3>
                                            <div className="space-y-3">
                                                {challenge?.testCases.map((test, idx) => (
                                                    <div key={idx} className="bg-[#0a0a0a] p-3 rounded border border-gray-800 font-mono text-sm">
                                                        <div className="flex gap-2">
                                                            <span className="text-blue-400">Input:</span>
                                                            <span className="text-gray-300">{test.input}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <span className="text-green-400">Output:</span>
                                                            <span className="text-gray-300">{test.output}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Code Editor */}
                            <div className="space-y-6">
                                <Card className="bg-[#1a1a1a] border-gray-800 h-full flex flex-col">
                                    <CardHeader className="border-b border-gray-800 pb-4">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-white text-lg">Solution</CardTitle>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setCode(challenge?.starterCode || '')}
                                                    disabled={submitting}
                                                    className="border-gray-700 text-gray-300 hover:text-white"
                                                >
                                                    Reset
                                                </Button>
                                                <Button
                                                    onClick={handleSubmit}
                                                    disabled={submitting || challenge?.solved}
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                >
                                                    {submitting ? (
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                                    ) : (
                                                        <Play className="h-4 w-4 mr-2" />
                                                    )}
                                                    Run Code
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <div className="flex-1 relative bg-[#1e1e1e] overflow-hidden">
                                        <Editor
                                            value={code}
                                            onValueChange={code => setCode(code)}
                                            highlight={code => highlight(code, languages.python || languages.clike, 'python')}
                                            padding={16}
                                            style={{
                                                fontFamily: '"Fira Code", "Fira Mono", monospace',
                                                fontSize: 14,
                                                backgroundColor: '#1e1e1e',
                                                color: '#d4d4d4',
                                                minHeight: '100%',
                                            }}
                                            className="min-h-full"
                                            textareaClassName="focus:outline-none"
                                        />
                                    </div>
                                </Card>

                                {/* Result Console */}
                                {result && (
                                    <Card className={`border-gray-800 ${result.success ? 'bg-green-900/10' : 'bg-red-900/10'}`}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    {result.success ? (
                                                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                                                    ) : (
                                                        <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                                                    )}
                                                    <div>
                                                        <h4 className={`font-semibold ${result.success ? 'text-green-500' : 'text-red-500'}`}>
                                                            {result.success ? 'Success!' : 'Failed'}
                                                        </h4>
                                                        <p className="text-gray-400 text-sm mt-1">{result.message}</p>
                                                    </div>
                                                </div>
                                                {result.success && (
                                                    <Button variant="outline" size="sm" onClick={handleShare} className="border-green-500/50 text-green-500 hover:bg-green-500/10">
                                                        <Share2 className="h-4 w-4 mr-2" />
                                                        Share Solution
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="solutions">
                        <div className="space-y-6">
                            {solutions.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No solutions shared yet. Be the first!</p>
                                </div>
                            ) : (
                                solutions.map((solution) => (
                                    <Card key={solution.id} className="bg-[#1a1a1a] border-gray-800">
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                                        {solution.username[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-white">{solution.username}</div>
                                                        <div className="text-xs text-gray-400">{formatDate(solution.createdAt)}</div>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleVote(solution.id)}
                                                    className={`text-gray-400 hover:text-white ${solution.votes.includes(user?.id) ? 'text-primary' : ''}`}
                                                >
                                                    <ThumbsUp className={`h-4 w-4 mr-2 ${solution.votes.includes(user?.id) ? 'fill-current' : ''}`} />
                                                    {solution.votes.length}
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <CodeBlock language={solution.language} code={solution.code} />
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="leaderboard">
                        <Card className="bg-[#1a1a1a] border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-yellow-500" />
                                    Global Leaderboard
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {leaderboard.map((entry, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg border border-gray-800">
                                            <div className="flex items-center gap-4">
                                                <div className={`
                                                    w-8 h-8 rounded-full flex items-center justify-center font-bold
                                                    ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                                                        index === 1 ? 'bg-gray-400/20 text-gray-400' :
                                                            index === 2 ? 'bg-orange-500/20 text-orange-500' :
                                                                'bg-gray-800 text-gray-400'}
                                                `}>
                                                    {index + 1}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                                        {entry.username[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-white">{entry.username}</div>
                                                        <div className="text-sm text-gray-400">{entry.title || 'Developer'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-primary">{entry.points}</div>
                                                <div className="text-xs text-gray-400">Points</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default ChallengesPage;
