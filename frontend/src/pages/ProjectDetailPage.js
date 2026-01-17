import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Circle, Clock, Plus, Users, Briefcase, FileText, Upload, MessageSquare, Calendar, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';

const ProjectDetailPage = () => {
    const { id } = useParams();
    const { user, token } = useAuth();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskAssignee, setNewTaskAssignee] = useState('');
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [messageOpen, setMessageOpen] = useState(false);
    const [messageContent, setMessageContent] = useState('');
    const [selectedMember, setSelectedMember] = useState(null);
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('medium');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');

    useEffect(() => {
        fetchProject();
    }, [id]);

    const fetchProject = async () => {
        try {
            const response = await axios.get(`${API}/projects/${id}`);
            setProject(response.data);
        } catch (error) {
            console.error("Failed to fetch project", error);
            toast.error("Failed to load project details");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinProject = async () => {
        if (!user) {
            toast.error("Please login to join");
            return;
        }
        try {
            await axios.post(`${API}/projects/${id}/join`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Joined project successfully!");
            fetchProject();
        } catch (error) {
            toast.error("Failed to join project");
        }
    };

    const handlePromoteMember = async (memberId) => {
        try {
            await axios.post(`${API}/projects/${id}/promote`, { userId: memberId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Member promoted to Co-host!");
            fetchProject();
        } catch (error) {
            toast.error("Failed to promote member");
        }
    };

    const handleMessageMember = (member) => {
        setSelectedMember(member);
        setMessageOpen(true);
    };

    const sendMessage = async () => {
        if (!messageContent.trim()) return;
        try {
            await axios.post(`${API}/messages`, {
                receiverId: selectedMember.id,
                content: messageContent,
                projectId: project.id,
                projectTitle: project.title
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Message sent to ${selectedMember.name}`);
            setMessageOpen(false);
            setMessageContent('');
            setSelectedMember(null);
        } catch (error) {
            toast.error("Failed to send message");
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            await axios.post(`${API}/projects/${id}/files`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success("File uploaded successfully!");
            setIsUploadOpen(false);
            fetchProject();
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload file");
        } finally {
            setUploading(false);
        }
    };

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) return;
        try {
            await axios.post(`${API}/projects/${id}/tasks`, {
                title: newTaskTitle,
                description: newTaskDescription,
                priority: newTaskPriority,
                dueDate: newTaskDueDate || null,
                assigneeId: newTaskAssignee || null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Task added!");
            setNewTaskTitle('');
            setNewTaskDescription('');
            setNewTaskPriority('medium');
            setNewTaskDueDate('');
            setNewTaskAssignee('');
            setIsAddTaskOpen(false);
            fetchProject();
        } catch (error) {
            toast.error("Failed to add task");
        }
    };

    const handleChangeTaskStatus = async (taskId, newStatus) => {
        try {
            await axios.patch(`${API}/projects/${id}/tasks/${taskId}/status`, {
                status: newStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Task status updated!");
            fetchProject();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update task status");
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            await axios.delete(`${API}/projects/${id}/tasks/${taskId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Task deleted successfully!");
            fetchProject();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete task");
        }
    };

    const handleDeleteProject = async () => {
        if (!window.confirm('Are you sure you want to delete this entire project? This action cannot be undone.')) return;
        try {
            await axios.delete(`${API}/projects/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Project deleted successfully!");
            window.location.href = '/projects';
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete project");
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

    if (!project) return <div>Project not found</div>;

    const isMember = user && project.members?.includes(user.id);
    const userRole = project.roles?.[user?.id] || 'member';
    const canAddTask = ['admin', 'co-admin'].includes(userRole);
    const isAdmin = userRole === 'admin';

    const todoTasks = project.tasks?.filter(t => t.status === 'todo') || [];
    const inProgressTasks = project.tasks?.filter(t => t.status === 'in-progress') || [];
    const doneTasks = project.tasks?.filter(t => t.status === 'done') || [];

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">{project.title}</h1>
                            <p className="text-gray-400 max-w-3xl">{project.description}</p>
                        </div>
                        {!isMember && (
                            <Button onClick={handleJoinProject} className="bg-primary text-black hover:bg-primary/90">
                                Join Project
                            </Button>
                        )}
                        {isMember && (
                            <div className="flex items-center gap-4">
                                <Badge variant={project.status === 'open' ? 'default' : 'secondary'}>
                                    {project.status}
                                </Badge>
                                {userRole === 'admin' && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleDeleteProject}
                                        className="gap-2"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete Project
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4 mt-4">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Users className="h-4 w-4" />
                            <span>{project.members?.length || 0} Members</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                            <Briefcase className="h-4 w-4" />
                            <span>{project.status}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Task Board */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-white">Project Tasks</h2>
                            {isMember && canAddTask && (
                                <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="border-gray-700 text-gray-300">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Task
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
                                        <DialogHeader>
                                            <DialogTitle>Add New Task</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 mt-4">
                                            <div className="space-y-2">
                                                <Label>Task Title</Label>
                                                <Input
                                                    value={newTaskTitle}
                                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                                    placeholder="e.g. Setup Database Schema"
                                                    className="bg-[#0a0a0a] border-gray-800"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Description (Optional)</Label>
                                                <Textarea
                                                    value={newTaskDescription}
                                                    onChange={(e) => setNewTaskDescription(e.target.value)}
                                                    placeholder="Task description..."
                                                    className="bg-[#0a0a0a] border-gray-800 h-20"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Priority</Label>
                                                    <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                                                        <SelectTrigger className="bg-[#0a0a0a] border-gray-800">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-[#1a1a1a] border-gray-800">
                                                            <SelectItem value="low">Low</SelectItem>
                                                            <SelectItem value="medium">Medium</SelectItem>
                                                            <SelectItem value="high">High</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Due Date (Optional)</Label>
                                                    <Input
                                                        type="date"
                                                        value={newTaskDueDate}
                                                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                                                        className="bg-[#0a0a0a] border-gray-800"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Assignee (Optional)</Label>
                                                <select
                                                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-md p-2 text-white"
                                                    value={newTaskAssignee}
                                                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {project.membersDetails?.map(member => (
                                                        <option key={member.id} value={member.id}>
                                                            {member.name} (@{member.username})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <Button onClick={handleAddTask} className="w-full bg-primary text-black hover:bg-primary/90">
                                                Add Task
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Todo Column */}
                            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Circle className="h-4 w-4" /> To Do
                                </h3>
                                <div className="space-y-3">
                                    {todoTasks.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            project={project}
                                            onStatusChange={handleChangeTaskStatus}
                                            onDelete={handleDeleteTask}
                                            canManage={canAddTask || task.assigneeId === user?.id}
                                        />
                                    ))}
                                    {todoTasks.length === 0 && <div className="text-xs text-gray-500 italic">No tasks</div>}
                                </div>
                            </div>

                            {/* In Progress Column */}
                            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
                                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Clock className="h-4 w-4" /> In Progress
                                </h3>
                                <div className="space-y-3">
                                    {inProgressTasks.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            project={project}
                                            onStatusChange={handleChangeTaskStatus}
                                            onDelete={handleDeleteTask}
                                            canManage={canAddTask || task.assigneeId === user?.id}
                                            statusColor="blue"
                                        />
                                    ))}
                                    {inProgressTasks.length === 0 && <div className="text-xs text-gray-500 italic">No tasks</div>}
                                </div>
                            </div>

                            {/* Done Column */}
                            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
                                <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" /> Done
                                </h3>
                                <div className="space-y-3">
                                    {doneTasks.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            project={project}
                                            onStatusChange={handleChangeTaskStatus}
                                            onDelete={handleDeleteTask}
                                            canManage={canAddTask || task.assigneeId === user?.id}
                                            statusColor="green"
                                            isDone
                                        />
                                    ))}
                                    {doneTasks.length === 0 && <div className="text-xs text-gray-500 italic">No tasks</div>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Files Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-white">Project Files</h2>
                            {isMember && (
                                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="border-gray-700 text-gray-300">
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload File
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
                                        <DialogHeader>
                                            <DialogTitle>Upload Project File</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 mt-4">
                                            <div className="space-y-2">
                                                <Label>Select File</Label>
                                                <Input
                                                    type="file"
                                                    onChange={handleFileUpload}
                                                    disabled={uploading}
                                                    className="bg-[#0a0a0a] border-gray-800"
                                                />
                                            </div>
                                            {uploading && <div className="text-sm text-gray-400">Uploading...</div>}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {project.files?.map(file => (
                                <Card key={file.id} className="bg-[#1a1a1a] border-gray-800 p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white hover:underline hover:text-primary block truncate max-w-[200px]">
                                                    {file.name}
                                                </a>
                                                <div className="text-xs text-gray-500">
                                                    Uploaded by {project.membersDetails?.find(m => m.id === file.uploadedBy)?.name || 'Unknown'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            {(!project.files || project.files.length === 0) && (
                                <div className="col-span-full text-center py-8 text-gray-500 bg-[#1a1a1a] rounded-lg border border-gray-800 border-dashed">
                                    No files uploaded yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card className="bg-[#1a1a1a] border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-lg text-white">Tech Stack</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {project.techStack.map((tech, i) => (
                                        <Badge key={i} variant="secondary" className="bg-gray-800 text-gray-300">
                                            {tech}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#1a1a1a] border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-lg text-white">Team Members</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {project.membersDetails?.map(member => (
                                        <div key={member.id} className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                                {member.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-white">
                                                    {member.name}
                                                    {project.roles?.[member.id] === 'admin' && <Badge className="ml-2 bg-red-500/20 text-red-500 text-[10px] px-1 py-0">Host</Badge>}
                                                    {project.roles?.[member.id] === 'co-admin' && <Badge className="ml-2 bg-blue-500/20 text-blue-500 text-[10px] px-1 py-0">Co-host</Badge>}
                                                </div>
                                                <div className="text-xs text-gray-500">@{member.username}</div>
                                                <div className="flex gap-2 mt-1">
                                                    {isAdmin && member.id !== user.id && project.roles?.[member.id] !== 'co-admin' && (
                                                        <button
                                                            onClick={() => handlePromoteMember(member.id)}
                                                            className="text-[10px] text-primary hover:underline"
                                                        >
                                                            Promote to Co-host
                                                        </button>
                                                    )}
                                                    {member.id !== user.id && (
                                                        <button
                                                            onClick={() => handleMessageMember(member)}
                                                            className="text-[10px] text-gray-400 hover:text-white hover:underline flex items-center gap-1"
                                                        >
                                                            <MessageSquare className="h-3 w-3" />
                                                            Message
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!project.membersDetails || project.membersDetails.length === 0) && (
                                        <div className="text-sm text-gray-500">Loading members...</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Message Dialog */}
            <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
                <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Message {selectedMember?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>Message</Label>
                            <textarea
                                className="w-full h-32 bg-[#0a0a0a] border border-gray-800 rounded-md p-3 text-white resize-none focus:outline-none focus:border-primary"
                                placeholder="Type your message here..."
                                value={messageContent}
                                onChange={(e) => setMessageContent(e.target.value)}
                            />
                        </div>
                        <Button onClick={sendMessage} className="w-full bg-primary text-black hover:bg-primary/90">
                            Send Message
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            <Footer />
        </div >
    );
};

// Task Card Component
const TaskCard = ({ task, project, onStatusChange, canManage, statusColor, isDone, onDelete }) => {
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const getDueDateStatus = (dueDate) => {
        if (!dueDate) return null;
        const due = new Date(dueDate);
        const now = new Date();
        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, color: 'text-red-500' };
        if (diffDays === 0) return { text: 'Due today', color: 'text-orange-500' };
        if (diffDays <= 3) return { text: `Due in ${diffDays}d`, color: 'text-yellow-500' };
        return { text: `Due in ${diffDays}d`, color: 'text-gray-400' };
    };

    const assignee = project.membersDetails?.find(m => m.id === task.assigneeId);
    const dueDateInfo = getDueDateStatus(task.dueDate);

    return (
        <Card className={`bg-[#0a0a0a] border-gray-800 p-3 ${statusColor ? `border-l-2 border-l-${statusColor}-500` : ''} ${isDone ? 'opacity-70' : ''} group hover:bg-[#151515] transition-colors`}>
            <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <div className={`text-sm text-gray-200 font-medium ${isDone ? 'line-through' : ''}`}>
                        {task.title}
                    </div>
                    {task.priority && (
                        <Badge className={`text-[10px] px-1.5 py-0 ${getPriorityColor(task.priority)}`}>
                            {task.priority.toUpperCase()}
                        </Badge>
                    )}
                </div>

                {task.description && (
                    <p className="text-xs text-gray-400 line-clamp-2">{task.description}</p>
                )}

                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        {assignee && (
                            <div className="flex items-center gap-1">
                                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary font-bold">
                                    {assignee.name?.[0]?.toUpperCase()}
                                </div>
                                <span className="text-[10px] text-gray-500">@{assignee.username}</span>
                            </div>
                        )}
                        {dueDateInfo && (
                            <div className={`flex items-center gap-1 text-[10px] ${dueDateInfo.color}`}>
                                <Calendar className="h-3 w-3" />
                                {dueDateInfo.text}
                            </div>
                        )}
                    </div>

                    {canManage && (
                        <div className="flex items-center gap-2">
                            <Select
                                value={task.status}
                                onValueChange={(newStatus) => onStatusChange(task.id, newStatus)}
                            >
                                <SelectTrigger className="h-6 text-[10px] w-[100px] bg-[#1a1a1a] border-gray-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                                    <SelectItem value="todo">To Do</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-gray-400 hover:text-red-500"
                                onClick={() => onDelete(task.id)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default ProjectDetailPage;
