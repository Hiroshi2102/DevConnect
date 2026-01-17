import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Eye, Bookmark, Save, Trash2, Filter, X } from 'lucide-react';
import { formatDate, calculateReadTime } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import CodeBlock from '@/components/common/CodeBlock';

const SearchPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, token } = useAuth();

    // Filter States
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [type, setType] = useState('all');
    const [sort, setSort] = useState('relevance');
    const [timeframe, setTimeframe] = useState('all');
    const [status, setStatus] = useState('all'); // For questions
    const [selectedTags, setSelectedTags] = useState([]);
    const [tagInput, setTagInput] = useState('');

    // Data States
    const [results, setResults] = useState({ posts: [], questions: [], users: [] });
    const [loading, setLoading] = useState(false);
    const [savedSearches, setSavedSearches] = useState([]);
    const [savedSearchName, setSavedSearchName] = useState('');

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) setQuery(q);
        fetchResults();
        if (user) fetchSavedSearches();
    }, [searchParams]);

    const fetchResults = async () => {
        setLoading(true);
        try {
            const params = {
                q: query,
                type,
                sort,
                time: timeframe,
                status,
                limit: 20
            };

            // Add tags to params
            if (selectedTags.length > 0) {
                params.tags = selectedTags.join(',');
            }

            const response = await axios.get(`${API}/search`, { params });
            setResults(response.data);
        } catch (error) {
            console.error('Search failed:', error);
            toast.error('Failed to fetch search results');
        } finally {
            setLoading(false);
        }
    };

    const fetchSavedSearches = async () => {
        try {
            const response = await axios.get(`${API}/searches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSavedSearches(response.data);
        } catch (error) {
            console.error('Failed to fetch saved searches');
        }
    };

    const handleSearch = () => {
        setSearchParams({ q: query }); // This triggers useEffect
    };

    const handleSaveSearch = async () => {
        if (!savedSearchName.trim()) {
            toast.error('Please name your search');
            return;
        }

        const searchConfig = {
            query,
            type,
            sort,
            timeframe,
            status,
            tags: selectedTags
        };

        try {
            await axios.post(`${API}/searches`, {
                name: savedSearchName,
                query: JSON.stringify(searchConfig)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Search saved!');
            setSavedSearchName('');
            fetchSavedSearches();
        } catch (error) {
            toast.error('Failed to save search');
        }
    };

    const loadSavedSearch = (savedSearch) => {
        try {
            const config = JSON.parse(savedSearch.query);
            setQuery(config.query || '');
            setType(config.type || 'all');
            setSort(config.sort || 'relevance');
            setTimeframe(config.timeframe || 'all');
            setStatus(config.status || 'all');
            setSelectedTags(config.tags || []);

            // Trigger search
            setSearchParams({ q: config.query || '' });
        } catch (error) {
            toast.error('Failed to load saved search');
        }
    };

    const deleteSavedSearch = async (id, e) => {
        e.stopPropagation();
        try {
            await axios.delete(`${API}/searches/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Saved search deleted');
            setSavedSearches(savedSearches.filter(s => s.id !== id));
        } catch (error) {
            toast.error('Failed to delete search');
        }
    };

    const addTag = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            if (!selectedTags.includes(tagInput.trim())) {
                setSelectedTags([...selectedTags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Sidebar - Filters */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="flex items-center justify-between lg:hidden mb-4">
                            <h2 className="text-xl font-bold text-white">Filters</h2>
                            <Button variant="outline" size="sm">
                                <Filter className="h-4 w-4 mr-2" />
                                Apply
                            </Button>
                        </div>

                        <Card className="bg-[#1a1a1a] border-gray-800 sticky top-24">
                            <CardHeader>
                                <h3 className="font-semibold text-white">Search Filters</h3>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Type */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Type</label>
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                                            <SelectValue placeholder="Content Type" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1a1a1a] border-gray-800 text-white">
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="posts">Posts</SelectItem>
                                            <SelectItem value="questions">Questions</SelectItem>
                                            <SelectItem value="users">Users</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Sort */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Sort By</label>
                                    <Select value={sort} onValueChange={setSort}>
                                        <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1a1a1a] border-gray-800 text-white">
                                            <SelectItem value="relevance">Relevance</SelectItem>
                                            <SelectItem value="newest">Newest</SelectItem>
                                            <SelectItem value="popular">Most Popular</SelectItem>
                                            {type === 'questions' && <SelectItem value="unanswered">Unanswered</SelectItem>}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Timeframe */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Timeframe</label>
                                    <Select value={timeframe} onValueChange={setTimeframe}>
                                        <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                                            <SelectValue placeholder="Timeframe" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1a1a1a] border-gray-800 text-white">
                                            <SelectItem value="all">All Time</SelectItem>
                                            <SelectItem value="day">Past 24 Hours</SelectItem>
                                            <SelectItem value="week">Past Week</SelectItem>
                                            <SelectItem value="month">Past Month</SelectItem>
                                            <SelectItem value="year">Past Year</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Tags */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Tags</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {selectedTags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30">
                                                {tag}
                                                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeTag(tag)} />
                                            </Badge>
                                        ))}
                                    </div>
                                    <Input
                                        placeholder="Type tag & press Enter"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={addTag}
                                        className="bg-[#0a0a0a] border-gray-700 text-white"
                                    />
                                </div>

                                {/* Status (Questions only) */}
                                {type === 'questions' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400">Status</label>
                                        <Select value={status} onValueChange={setStatus}>
                                            <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1a1a1a] border-gray-800 text-white">
                                                <SelectItem value="all">All</SelectItem>
                                                <SelectItem value="solved">Solved</SelectItem>
                                                <SelectItem value="unsolved">Unsolved</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <Button
                                    className="w-full bg-primary hover:bg-primary/90 text-white"
                                    onClick={fetchResults}
                                >
                                    Apply Filters
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Saved Searches */}
                        {user && (
                            <Card className="bg-[#1a1a1a] border-gray-800">
                                <CardHeader>
                                    <h3 className="font-semibold text-white">Saved Searches</h3>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {savedSearches.length === 0 ? (
                                        <p className="text-sm text-gray-400">No saved searches yet.</p>
                                    ) : (
                                        savedSearches.map(search => (
                                            <div
                                                key={search.id}
                                                className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer group"
                                                onClick={() => loadSavedSearch(search)}
                                            >
                                                <span className="text-sm text-gray-300">{search.name}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                                                    onClick={(e) => deleteSavedSearch(search.id, e)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))
                                    )}

                                    <div className="pt-4 border-t border-gray-800 mt-4">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Save current search..."
                                                value={savedSearchName}
                                                onChange={(e) => setSavedSearchName(e.target.value)}
                                                className="h-8 bg-[#0a0a0a] border-gray-700 text-white text-xs"
                                            />
                                            <Button size="sm" variant="secondary" className="h-8" onClick={handleSaveSearch}>
                                                <Save className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Main Content - Results */}
                    <div className="lg:col-span-9">
                        <div className="mb-6">
                            <div className="flex gap-4">
                                <Input
                                    placeholder="Search posts..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="bg-[#1a1a1a] border-gray-800 text-white h-12 text-lg"
                                />
                                <Button size="lg" className="h-12 px-8" onClick={handleSearch}>
                                    Search
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <div className="spinner w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
                                </div>
                            ) : (!results.posts?.length && !results.questions?.length && !results.users?.length) ? (
                                <div className="text-center py-20 text-gray-400">
                                    <p className="text-xl mb-2">No results found</p>
                                    <p>Try adjusting your filters or search query</p>
                                </div>
                            ) : (
                                <>
                                    {/* Posts */}
                                    {results.posts?.map((post, index) => (
                                        <motion.div
                                            key={`post-${post.id}`}
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
                                                                <p className="text-sm font-medium text-white">Post</p>
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
                                    ))}

                                    {/* Questions */}
                                    {results.questions?.map((question, index) => (
                                        <motion.div
                                            key={`question-${question.id}`}
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
                                                                <p className="text-sm font-medium text-white">Question</p>
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
                                    ))}

                                    {/* Users */}
                                    {results.users?.map((user, index) => (
                                        <motion.div
                                            key={`user-${user.id}`}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <Card
                                                className="bg-[#1a1a1a] border-gray-800 card-hover cursor-pointer transition-all"
                                                onClick={() => navigate(`/profile/${user.username}`)}
                                            >
                                                <CardContent className="flex items-center gap-4 p-6">
                                                    <Avatar className="h-16 w-16">
                                                        <AvatarImage src={user.avatar} />
                                                        <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-white">{user.name}</h3>
                                                        <p className="text-gray-400">@{user.username}</p>
                                                        {user.bio && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{user.bio}</p>}
                                                    </div>
                                                    <div className="ml-auto">
                                                        <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                                                            {user.rank || 'Beginner'}
                                                        </Badge>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchPage;
