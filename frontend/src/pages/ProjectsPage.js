import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, Users, Plus, Search, Filter, GitBranch, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const ProjectsPage = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Form State
    const [newProject, setNewProject] = useState({
        title: '',
        description: '',
        techStack: '',
        status: 'open'
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await axios.get(`${API}/projects`);
            setProjects(response.data);
        } catch (error) {
            console.error("Failed to fetch projects", error);
            toast.error("Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async () => {
        if (!user) {
            toast.error("Please login to create a project");
            return;
        }
        try {
            const stackArray = newProject.techStack.split(',').map(s => s.trim()).filter(s => s);
            const projectData = {
                title: newProject.title,
                description: newProject.description,
                techStack: stackArray,
                status: newProject.status
            };

            await axios.post(`${API}/projects`, projectData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Project created successfully!");
            setIsCreateOpen(false);
            setNewProject({ title: '', description: '', techStack: '', status: 'open' });
            fetchProjects();
        } catch (error) {
            toast.error("Failed to create project");
        }
    };

    const filteredProjects = projects.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.techStack.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
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

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Briefcase className="h-8 w-8 text-primary" />
                            Project Collaboration
                        </h1>
                        <p className="text-gray-400 mt-2">Find teammates, join projects, or start your own.</p>
                    </div>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90 text-black font-semibold">
                                <Plus className="h-4 w-4 mr-2" />
                                Post Project
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
                            <DialogHeader>
                                <DialogTitle>Create New Project</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label>Project Title</Label>
                                    <Input
                                        value={newProject.title}
                                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                                        placeholder="e.g. AI-Powered Task Manager"
                                        className="bg-[#0a0a0a] border-gray-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={newProject.description}
                                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                        placeholder="Describe the project and what you're looking for..."
                                        className="bg-[#0a0a0a] border-gray-800 min-h-[100px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tech Stack</Label>
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {newProject.techStack.split(',').map(s => s.trim()).filter(s => s).map((tag, index) => (
                                                <Badge key={index} variant="secondary" className="bg-gray-800 text-gray-300 flex items-center gap-1">
                                                    {tag}
                                                    <X
                                                        className="h-3 w-3 cursor-pointer hover:text-white"
                                                        onClick={() => {
                                                            const tags = newProject.techStack.split(',').map(s => s.trim()).filter(s => s);
                                                            tags.splice(index, 1);
                                                            setNewProject({ ...newProject, techStack: tags.join(', ') });
                                                        }}
                                                    />
                                                </Badge>
                                            ))}
                                        </div>
                                        <Input
                                            placeholder="Type and press comma to add tags (e.g. React, Node.js)"
                                            className="bg-[#0a0a0a] border-gray-800"
                                            onKeyDown={(e) => {
                                                if (e.key === ',' || e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = e.currentTarget.value.trim();
                                                    if (val) {
                                                        const currentTags = newProject.techStack ? newProject.techStack.split(',').map(s => s.trim()).filter(s => s) : [];
                                                        if (!currentTags.includes(val)) {
                                                            setNewProject({ ...newProject, techStack: [...currentTags, val].join(', ') });
                                                        }
                                                        e.currentTarget.value = '';
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleCreateProject} className="w-full bg-primary text-black hover:bg-primary/90">
                                    Create Project
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Search and Filters */}
                <div className="flex items-center gap-4 mb-8 bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
                    <Search className="h-5 w-5 text-gray-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search projects by title, description, or tech stack..."
                        className="bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-gray-500"
                    />
                </div>

                {/* Projects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                        <Card key={project.id} className="bg-[#1a1a1a] border-gray-800 hover:border-gray-700 transition-colors flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className={`
                                        ${project.status === 'open' ? 'border-green-500 text-green-500' :
                                            project.status === 'in-progress' ? 'border-blue-500 text-blue-500' :
                                                'border-gray-500 text-gray-500'}
                                    `}>
                                        {project.status.replace('-', ' ').toUpperCase()}
                                    </Badge>
                                    <div className="text-xs text-gray-500">{formatDate(project.createdAt)}</div>
                                </div>
                                <CardTitle className="text-xl text-white line-clamp-1">{project.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-gray-400 text-sm line-clamp-3 mb-4">
                                    {project.description}
                                </p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {project.techStack.slice(0, 3).map((tech, i) => (
                                        <Badge key={i} variant="secondary" className="bg-gray-800 text-gray-300 hover:bg-gray-700">
                                            {tech}
                                        </Badge>
                                    ))}
                                    {project.techStack.length > 3 && (
                                        <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                                            +{project.techStack.length - 3}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Users className="h-4 w-4" />
                                    <span>{project.members.length} member{project.members.length !== 1 ? 's' : ''}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="border-t border-gray-800 pt-4">
                                <Button
                                    className="w-full bg-gray-800 hover:bg-gray-700 text-white"
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                >
                                    View Details
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {filteredProjects.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No projects found matching your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectsPage;
