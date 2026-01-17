import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/App';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const TrendingPosts = () => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrendingPosts();
    }, []);

    const fetchTrendingPosts = async () => {
        try {
            const response = await axios.get(`${API}/posts/trending`);
            setPosts(response.data);
        } catch (error) {
            console.error('Failed to fetch trending posts:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
                <CardHeader>
                    <div className="h-6 w-32 bg-gray-800 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-gray-800 rounded animate-pulse"></div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (posts.length === 0) return null;

    return (
        <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-white">Trending Now</h2>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-4">
                    {posts.map((post, index) => (
                        <div
                            key={post.id}
                            onClick={() => navigate(`/posts/${post.id}`)}
                            className="group cursor-pointer"
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-2xl font-bold text-gray-700 group-hover:text-primary transition-colors">
                                    {index + 1}
                                </span>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-200 group-hover:text-primary transition-colors line-clamp-2">
                                        {post.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {post.views} views • {post.likes.length} likes
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default TrendingPosts;
