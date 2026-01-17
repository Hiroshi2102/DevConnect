import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Shield, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

const AdminPage = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && user.role !== 'admin') {
            navigate('/feed');
            toast.error('Unauthorized access');
        } else if (user && token) {
            fetchData();
        }
    }, [user, token, navigate]);

    const fetchData = async () => {
        try {
            const [usersRes, postsRes] = await Promise.all([
                axios.get(`${API}/admin/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API}/posts?limit=100`) // Reusing public endpoint for now
            ]);
            setUsers(usersRes.data);
            setPosts(postsRes.data);
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
            toast.error('Failed to load admin data');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            await axios.delete(`${API}/admin/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(users.filter(u => u.id !== userId));
            toast.success('User deleted successfully');
        } catch (error) {
            toast.error('Failed to delete user');
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;

        try {
            await axios.delete(`${API}/admin/posts/${postId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPosts(posts.filter(p => p.id !== postId));
            toast.success('Post deleted successfully');
        } catch (error) {
            toast.error('Failed to delete post');
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
                <div className="flex items-center gap-3 mb-8">
                    <Shield className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                </div>

                <Tabs defaultValue="users" className="w-full">
                    <TabsList className="bg-[#1a1a1a] mb-6">
                        <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
                        <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="users">
                        <Card className="bg-[#1a1a1a] border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-white">User Management</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-gray-800 hover:bg-transparent">
                                            <TableHead className="text-gray-400">User</TableHead>
                                            <TableHead className="text-gray-400">Role</TableHead>
                                            <TableHead className="text-gray-400">Points</TableHead>
                                            <TableHead className="text-gray-400">Joined</TableHead>
                                            <TableHead className="text-right text-gray-400">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map((u) => (
                                            <TableRow key={u.id} className="border-gray-800 hover:bg-[#252525]">
                                                <TableCell className="font-medium text-white">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                                                            {u.avatar ? (
                                                                <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <UserIcon className="h-4 w-4 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold">{u.name}</div>
                                                            <div className="text-xs text-gray-400">@{u.username}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className={u.role === 'admin' ? 'bg-primary/20 text-primary' : ''}>
                                                        {u.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-gray-300">{u.points}</TableCell>
                                                <TableCell className="text-gray-300">{formatDate(u.createdAt)}</TableCell>
                                                <TableCell className="text-right">
                                                    {u.role !== 'admin' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                            onClick={() => handleDeleteUser(u.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="posts">
                        <Card className="bg-[#1a1a1a] border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-white">Post Management</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-gray-800 hover:bg-transparent">
                                            <TableHead className="text-gray-400">Title</TableHead>
                                            <TableHead className="text-gray-400">Author</TableHead>
                                            <TableHead className="text-gray-400">Category</TableHead>
                                            <TableHead className="text-gray-400">Date</TableHead>
                                            <TableHead className="text-right text-gray-400">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {posts.map((post) => (
                                            <TableRow key={post.id} className="border-gray-800 hover:bg-[#252525]">
                                                <TableCell className="font-medium text-white max-w-xs truncate">
                                                    {post.title}
                                                </TableCell>
                                                <TableCell className="text-gray-300">
                                                    {users.find(u => u.id === post.authorId)?.username || 'Unknown'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="border-gray-700 text-gray-300">
                                                        {post.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-gray-300">{formatDate(post.createdAt)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                        onClick={() => handleDeletePost(post.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default AdminPage;
