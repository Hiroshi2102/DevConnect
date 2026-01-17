import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ChevronRight, ChevronLeft, CheckCircle, XCircle, Play, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import confetti from 'canvas-confetti';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css'; // Dark theme

const TutorialViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tutorial, setTutorial] = useState(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [userCode, setUserCode] = useState('');
    const [output, setOutput] = useState('');
    const [quizAnswer, setQuizAnswer] = useState('');
    const [stepStatus, setStepStatus] = useState('pending'); // pending, success, error

    useEffect(() => {
        fetchTutorial();
    }, [id]);

    const fetchTutorial = async () => {
        try {
            const response = await axios.get(`${API}/tutorials/${id}`);
            setTutorial(response.data);
            if (response.data.steps.length > 0) {
                setUserCode(response.data.steps[0].code || '');
            }
        } catch (error) {
            console.error("Failed to fetch tutorial", error);
            toast.error("Failed to load tutorial");
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (currentStepIndex < tutorial.steps.length - 1) {
            const nextIndex = currentStepIndex + 1;
            setCurrentStepIndex(nextIndex);
            setUserCode(tutorial.steps[nextIndex].code || '');
            setOutput('');
            setQuizAnswer('');
            setStepStatus('pending');
        } else {
            // Tutorial Completed
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
            toast.success("Tutorial Completed!");
            setTimeout(() => navigate('/tutorials'), 2000);
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            const prevIndex = currentStepIndex - 1;
            setCurrentStepIndex(prevIndex);
            setUserCode(tutorial.steps[prevIndex].code || '');
            setOutput('');
            setQuizAnswer('');
            setStepStatus('pending');
        }
    };

    const runCode = () => {
        // Simple client-side mock execution for MVP
        // In a real app, send to backend sandbox
        try {
            let capturedOutput = [];
            const mockPrint = (msg) => capturedOutput.push(String(msg));

            // Very unsafe eval, but okay for this specific demo context where we control the tutorials
            // We are replacing 'print' with our mock function
            const codeToRun = userCode.replace(/print\(/g, 'mockPrint(');

            // Create a function with 'mockPrint' in scope
            const run = new Function('mockPrint', codeToRun);
            run(mockPrint);

            const result = capturedOutput.join('\n');
            setOutput(result);

            const currentStep = tutorial.steps[currentStepIndex];
            if (currentStep.test && result.trim() === currentStep.test.trim()) {
                setStepStatus('success');
                toast.success("Correct output!");
            } else if (currentStep.test) {
                setStepStatus('error');
                toast.error("Incorrect output. Try again!");
            }
        } catch (error) {
            setOutput(`Error: ${error.message}`);
            setStepStatus('error');
        }
    };

    const checkQuiz = () => {
        const currentStep = tutorial.steps[currentStepIndex];
        if (quizAnswer === currentStep.quiz.answer) {
            setStepStatus('success');
            toast.success("Correct answer!");
        } else {
            setStepStatus('error');
            toast.error("Incorrect answer. Try again!");
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

    if (!tutorial) return <div>Tutorial not found</div>;

    const currentStep = tutorial.steps[currentStepIndex];
    const isLastStep = currentStepIndex === tutorial.steps.length - 1;

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
            <Navbar />

            <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex gap-6 h-[calc(100vh-64px)]">
                {/* Left Panel: Content */}
                <Card className="w-1/3 bg-[#1a1a1a] border-gray-800 flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-center mb-2">
                            <Badge variant="outline" className="text-primary border-primary">
                                Step {currentStepIndex + 1} of {tutorial.steps.length}
                            </Badge>
                        </div>
                        <CardTitle className="text-xl text-white">{currentStep.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto prose prose-invert max-w-none">
                        <ReactMarkdown>{currentStep.content}</ReactMarkdown>

                        {currentStep.quiz && (
                            <div className="mt-8 p-4 bg-[#0a0a0a] rounded-lg border border-gray-800">
                                <h4 className="text-white font-semibold mb-3">Quiz</h4>
                                <p className="text-gray-300 mb-4">{currentStep.quiz.question}</p>
                                <RadioGroup value={quizAnswer} onValueChange={setQuizAnswer}>
                                    {currentStep.quiz.options.map((option, idx) => (
                                        <div key={idx} className="flex items-center space-x-2">
                                            <RadioGroupItem value={option} id={`option-${idx}`} />
                                            <Label htmlFor={`option-${idx}`} className="text-gray-300 cursor-pointer">{option}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                                <Button
                                    onClick={checkQuiz}
                                    className="mt-4 w-full"
                                    disabled={!quizAnswer || stepStatus === 'success'}
                                >
                                    Check Answer
                                </Button>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="border-t border-gray-800 pt-4 flex justify-between">
                        <Button
                            variant="outline"
                            onClick={handlePrev}
                            disabled={currentStepIndex === 0}
                            className="border-gray-700 text-gray-300"
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" /> Previous
                        </Button>
                        <Button
                            onClick={handleNext}
                            disabled={stepStatus !== 'success' && (currentStep.test || currentStep.quiz)}
                            className="bg-primary text-black hover:bg-primary/90"
                        >
                            {isLastStep ? 'Finish' : 'Next'} <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </CardFooter>
                </Card>

                {/* Right Panel: Code Editor & Output */}
                <div className="w-2/3 flex flex-col gap-6">
                    <Card className="flex-1 bg-[#1a1a1a] border-gray-800 flex flex-col overflow-hidden">
                        <CardHeader className="py-3 bg-[#0a0a0a] border-b border-gray-800 flex flex-row justify-between items-center">
                            <span className="text-sm font-mono text-gray-400">main.py</span>
                            <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setUserCode(currentStep.code)} title="Reset Code">
                                    <RefreshCw className="h-4 w-4 text-gray-400" />
                                </Button>
                                <Button size="sm" onClick={runCode} className="bg-green-600 hover:bg-green-700 text-white">
                                    <Play className="h-4 w-4 mr-2" /> Run Code
                                </Button>
                            </div>
                        </CardHeader>
                        <div className="flex-1 relative bg-[#1e1e1e] overflow-hidden">
                            <Editor
                                value={userCode}
                                onValueChange={code => setUserCode(code)}
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

                    <Card className="h-1/3 bg-[#1a1a1a] border-gray-800 flex flex-col">
                        <CardHeader className="py-2 border-b border-gray-800">
                            <CardTitle className="text-sm text-gray-400">Output</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-4 font-mono text-sm overflow-y-auto">
                            {output ? (
                                <pre className={stepStatus === 'error' ? 'text-red-400' : 'text-green-400'}>
                                    {output}
                                </pre>
                            ) : (
                                <span className="text-gray-600 italic">Run code to see output...</span>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TutorialViewer;
