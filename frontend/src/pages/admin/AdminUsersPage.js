import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, ShieldAlert, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const AdminUsersPage = () => {
    const { user, token } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API}/admin/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleUpdate = async (userId, newRole) => {
        try {
            await axios.put(
                `${API}/admin/users/${userId}/role`,
                null,
                {
                    params: { role: newRole },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            toast.success(`User role updated to ${newRole}`);
            // Update local state
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (error) {
            toast.error('Failed to update user role');
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

    if (!user || user.role !== 'admin') {
        return (
            <div className="min-h-screen bg-[#0a0a0a]">
                <Navbar />
                <div className="text-center py-20 text-white">
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-gray-400">You do not have permission to view this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-white">User Management</h1>
                    <div className="text-gray-400">Total Users: {users.length}</div>
                </div>

                <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
                    <CardContent className="p-4">
                        <input
                            type="text"
                            placeholder="Search users by name, username or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:border-primary"
                        />
                    </CardContent>
                </Card>

                <Card className="bg-[#1a1a1a] border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white">Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableHead className="text-gray-400">User</TableHead>
                                    <TableHead className="text-gray-400">Email</TableHead>
                                    <TableHead className="text-gray-400">Role</TableHead>
                                    <TableHead className="text-gray-400">Joined</TableHead>
                                    <TableHead className="text-gray-400">Points</TableHead>
                                    <TableHead className="text-gray-400">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((u) => (
                                    <TableRow key={u.id} className="border-gray-800 hover:bg-[#252525]">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} />
                                                    <AvatarFallback>{u.username[0]}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium text-white">{u.name}</div>
                                                    <div className="text-xs text-gray-400">@{u.username}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-300">{u.email}</TableCell>
                                        <TableCell>
                                            <Badge
                                                className={
                                                    u.role === 'admin' ? 'bg-red-500/10 text-red-500' :
                                                        u.role === 'moderator' ? 'bg-blue-500/10 text-blue-500' :
                                                            'bg-gray-500/10 text-gray-500'
                                                }
                                            >
                                                {u.role || 'user'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-400 text-sm">
                                            {formatDate(u.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-gray-300">{u.points}</TableCell>
                                        <TableCell>
                                            <Select
                                                defaultValue={u.role || 'user'}
                                                onValueChange={(val) => handleRoleUpdate(u.id, val)}
                                                disabled={u.id === user.id} // Prevent changing own role
                                            >
                                                <SelectTrigger className="w-32 h-8 bg-[#0a0a0a] border-gray-700 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#1a1a1a] border-gray-800 text-white">
                                                    <SelectItem value="user">
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-3 w-3" /> User
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="moderator">
                                                        <div className="flex items-center gap-2">
                                                            <Shield className="h-3 w-3" /> Moderator
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="admin">
                                                        <div className="flex items-center gap-2">
                                                            <ShieldAlert className="h-3 w-3" /> Admin
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminUsersPage;
