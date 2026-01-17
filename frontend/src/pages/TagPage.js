import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Eye, Hash, Users, FileText, HelpCircle } from 'lucide-react';
import { formatDate, calculateReadTime } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import CodeBlock from '@/components/common/CodeBlock';

const TagPage = () => {
    const { tagName } = useParams();
    const navigate = useNavigate();
    const { user, token, updateUser } = useAuth();

    const [tagInfo, setTagInfo] = useState(null);
    const [posts, setPosts] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        fetchTagData();
    }, [tagName, user]);

    const fetchTagData = async () => {
        setLoading(true);
        try {
            // Fetch tag stats
            const infoResponse = await axios.get(`${API}/tags/${tagName}/info`);
            setTagInfo(infoResponse.data);

            // Fetch posts with this tag
            const postsResponse = await axios.get(`${API}/search`, {
                params: { type: 'posts', tags: tagName, limit: 20 }
            });
            setPosts(postsResponse.data.posts || []);

            // Fetch questions with this tag
            const questionsResponse = await axios.get(`${API}/search`, {
                params: { type: 'questions', tags: tagName, limit: 20 }
            });
            setQuestions(questionsResponse.data.questions || []);

            // Check if following
            if (user && user.followingTags?.includes(tagName)) {
                setIsFollowing(true);
            } else {
                setIsFollowing(false);
            }
        } catch (error) {
            console.error('Failed to fetch tag data:', error);
            toast.error('Failed to load tag info');
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async () => {
        if (!user) {
            toast.error('Please login to follow tags');
            return;
        }

        setFollowLoading(true);
        try {
            if (isFollowing) {
                await axios.delete(`${API}/tags/${tagName}/follow`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success(`Unfollowed #${tagName}`);
                setIsFollowing(false);

                // Update local user context
                const updatedTags = user.followingTags.filter(t => t !== tagName);
                updateUser({ ...user, followingTags: updatedTags });
            } else {
                await axios.post(`${API}/tags/${tagName}/follow`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success(`Following #${tagName}`);
                setIsFollowing(true);

                // Update local user context
                const updatedTags = [...(user.followingTags || []), tagName];
                updateUser({ ...user, followingTags: updatedTags });
            }
            // Refresh info to update follower count
            const infoResponse = await axios.get(`${API}/tags/${tagName}/info`);
            setTagInfo(infoResponse.data);
        } catch (error) {
            toast.error('Failed to update follow status');
        } finally {
            setFollowLoading(false);
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

            <div className="bg-[#111] border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                                <Hash className="h-10 w-10 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold text-white mb-2">#{tagName}</h1>
                                <div className="flex items-center gap-6 text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        <span>{tagInfo?.postCount || 0} Posts</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <HelpCircle className="h-4 w-4" />
                                        <span>{tagInfo?.questionCount || 0} Questions</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        <span>{tagInfo?.followerCount || 0} Followers</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            className={`min-w-[140px] ${isFollowing
                                ? 'bg-transparent border border-gray-700 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50'
                                : 'bg-primary hover:bg-primary/90 text-white'}`}
                            onClick={handleFollowToggle}
                            disabled={followLoading}
                        >
                            {isFollowing ? 'Following' : 'Follow Tag'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs defaultValue="posts" className="space-y-6">
                    <TabsList className="bg-[#1a1a1a] border border-gray-800">
                        <TabsTrigger value="posts" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                            Top Posts
                        </TabsTrigger>
                        <TabsTrigger value="questions" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                            Questions
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="posts" className="space-y-6">
                        {posts.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 bg-[#1a1a1a] rounded-lg border border-gray-800">
                                <p className="text-xl mb-2">No posts found with #{tagName}</p>
                                <Button variant="link" onClick={() => navigate('/create/post')} className="text-primary">
                                    Create the first post!
                                </Button>
                            </div>
                        ) : (
                            posts.map((post, index) => (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card
                                        className="bg-[#1a1a1a] border-gray-800 card-hover cursor-pointer transition-all"
                                        onClick={() => navigate(`/posts/${post.id}`)}
                                    >
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`} />
                                                        <AvatarFallback>A</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">Author</p>
                                                        <p className="text-xs text-gray-400">{formatDate(post.createdAt)}</p>
                                                    </div>
                                                </div>
                                                <Badge className="bg-primary/10 text-primary">{post.category}</Badge>
                                            </div>
                                        </CardHeader>

                                        <CardContent>
                                            <h2 className="text-xl font-semibold text-white mb-2">{post.title}</h2>
                                            {post.excerpt && (
                                                <div className="text-gray-400 mb-4 line-clamp-3">
                                                    <ReactMarkdown>{post.content.substring(0, 300) + "..."}</ReactMarkdown>
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-2 mt-4">
                                                {post.tags.map((tag, idx) => (
                                                    <Badge key={idx} variant="outline" className="border-gray-700 text-gray-300">
                                                        #{tag}
                                                    </Badge>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-6 mt-6 text-sm text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <Heart className="h-4 w-4" />
                                                    {post.likes.length}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MessageCircle className="h-4 w-4" />
                                                    {post.commentsCount || 0}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Eye className="h-4 w-4" />
                                                    {post.views}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="questions" className="space-y-6">
                        {questions.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 bg-[#1a1a1a] rounded-lg border border-gray-800">
                                <p className="text-xl mb-2">No questions found with #{tagName}</p>
                                <Button variant="link" onClick={() => navigate('/questions')} className="text-primary">
                                    Ask a question!
                                </Button>
                            </div>
                        ) : (
                            questions.map((question, index) => (
                                <motion.div
                                    key={question.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card
                                        className="bg-[#1a1a1a] border-gray-800 card-hover cursor-pointer transition-all"
                                        onClick={() => navigate(`/questions/${question.id}`)}
                                    >
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${question.userId}`} />
                                                        <AvatarFallback>U</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">User</p>
                                                        <p className="text-xs text-gray-400">{formatDate(question.createdAt)}</p>
                                                    </div>
                                                </div>
                                                <Badge className={question.status === 'answered' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}>
                                                    {question.status}
                                                </Badge>
                                            </div>
                                        </CardHeader>

                                        <CardContent>
                                            <h2 className="text-xl font-semibold text-white mb-2">{question.title}</h2>
                                            <div className="text-gray-400 mb-4 line-clamp-2">
                                                {question.description.substring(0, 200)}...
                                            </div>

                                            <div className="flex flex-wrap gap-2 mt-4">
                                                {question.tags.map((tag, idx) => (
                                                    <Badge key={idx} variant="outline" className="border-gray-700 text-gray-300">
                                                        #{tag}
                                                    </Badge>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-6 mt-6 text-sm text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <Eye className="h-4 w-4" />
                                                    {question.views}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MessageCircle className="h-4 w-4" />
                                                    {question.answers?.length || 0} Answers
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default TagPage;
