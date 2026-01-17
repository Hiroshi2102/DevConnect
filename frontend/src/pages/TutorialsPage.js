import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Play, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const TutorialsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tutorials, setTutorials] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTutorials();
    }, []);

    const fetchTutorials = async () => {
        try {
            const response = await axios.get(`${API}/tutorials`);
            setTutorials(response.data);
        } catch (error) {
            console.error("Failed to fetch tutorials", error);
            toast.error("Failed to load tutorials");
        } finally {
            setLoading(false);
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
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <GraduationCap className="h-8 w-8 text-primary" />
                        Interactive Tutorials
                    </h1>
                    <p className="text-gray-400 mt-2">Learn by doing with step-by-step interactive coding lessons.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tutorials.map((tutorial) => (
                        <Card key={tutorial.id} className="bg-[#1a1a1a] border-gray-800 hover:border-gray-700 transition-colors flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className={`
                                        ${tutorial.difficulty === 'Beginner' ? 'border-green-500 text-green-500' :
                                            tutorial.difficulty === 'Intermediate' ? 'border-yellow-500 text-yellow-500' :
                                                'border-red-500 text-red-500'}
                                    `}>
                                        {tutorial.difficulty}
                                    </Badge>
                                    <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                                        {tutorial.category}
                                    </Badge>
                                </div>
                                <CardTitle className="text-xl text-white">{tutorial.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-gray-400 text-sm mb-4">
                                    {tutorial.description}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <BookOpen className="h-4 w-4" />
                                    <span>{tutorial.steps.length} Steps</span>
                                </div>
                            </CardContent>
                            <CardFooter className="border-t border-gray-800 pt-4">
                                <Button
                                    className="w-full bg-primary text-black hover:bg-primary/90"
                                    onClick={() => navigate(`/tutorials/${tutorial.id}`)}
                                >
                                    <Play className="h-4 w-4 mr-2" />
                                    Start Tutorial
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {tutorials.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No tutorials available yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TutorialsPage;
