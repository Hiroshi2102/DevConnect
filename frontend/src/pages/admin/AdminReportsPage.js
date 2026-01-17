import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { CheckCircle, XCircle, ExternalLink, Trash2, Ban } from 'lucide-react';

const AdminReportsPage = () => {
    const { user, token } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const response = await axios.get(`${API}/admin/reports`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReports(response.data);
        } catch (error) {
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (reportId, newStatus) => {
        try {
            await axios.put(
                `${API}/admin/reports/${reportId}`,
                null,
                {
                    params: { status: newStatus },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            toast.success(`Report marked as ${newStatus}`);
            fetchReports();
        } catch (error) {
            toast.error('Failed to update report status');
        }
    };

    const handleDeleteContent = async (targetId, targetType, reportId) => {
        if (!window.confirm('Are you sure you want to delete this content?')) return;

        try {
            await axios.delete(`${API}/${targetType}s/${targetId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Content deleted successfully');
            // Auto-resolve the report
            handleStatusUpdate(reportId, 'resolved');
        } catch (error) {
            toast.error('Failed to delete content');
        }
    };

    const handleBanUser = async (userId, reportId) => {
        if (!window.confirm('Are you sure you want to ban this user?')) return;

        try {
            await axios.put(
                `${API}/admin/users/${userId}/role`,
                null,
                {
                    params: { role: 'banned' },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            toast.success('User banned successfully');
            // Auto-resolve the report
            handleStatusUpdate(reportId, 'resolved');
        } catch (error) {
            toast.error('Failed to ban user');
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
                <h1 className="text-3xl font-bold text-white mb-8">Moderation Dashboard</h1>

                <Card className="bg-[#1a1a1a] border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white">Reports ({reports.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableHead className="text-gray-400">Date</TableHead>
                                    <TableHead className="text-gray-400">Type</TableHead>
                                    <TableHead className="text-gray-400">Reason</TableHead>
                                    <TableHead className="text-gray-400">Description</TableHead>
                                    <TableHead className="text-gray-400">Status</TableHead>
                                    <TableHead className="text-gray-400">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reports.map((report) => (
                                    <TableRow key={report.id} className="border-gray-800 hover:bg-[#252525]">
                                        <TableCell className="text-gray-300">
                                            {new Date(report.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="border-gray-700 text-gray-300">
                                                {report.targetType}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-300 capitalize">{report.reason}</TableCell>
                                        <TableCell className="text-gray-400 max-w-xs truncate">
                                            {report.description || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={
                                                    report.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                                        report.status === 'resolved' ? 'bg-green-500/10 text-green-500' :
                                                            'bg-gray-500/10 text-gray-500'
                                                }
                                            >
                                                {report.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {report.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                                                            onClick={() => handleStatusUpdate(report.id, 'resolved')}
                                                            title="Mark as Resolved"
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-gray-500 hover:text-gray-400 hover:bg-gray-500/10"
                                                            onClick={() => handleStatusUpdate(report.id, 'dismissed')}
                                                            title="Dismiss"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}

                                                {/* Delete Content Action */}
                                                {['post', 'question', 'comment'].includes(report.targetType) && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                        onClick={() => handleDeleteContent(report.targetId, report.targetType, report.id)}
                                                        title="Delete Content"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}

                                                {/* Ban User Action */}
                                                {report.targetType === 'user' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                        onClick={() => handleBanUser(report.targetId, report.id)}
                                                        title="Ban User"
                                                    >
                                                        <Ban className="h-4 w-4" />
                                                    </Button>
                                                )}

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                                                    onClick={() => window.open(`/${report.targetType}s/${report.targetId}`, '_blank')}
                                                    title="View Content"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {reports.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                            No reports found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminReportsPage;
