import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, MessageCircle, Eye, AlertCircle, ChevronUp, Sparkles } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const QuestionsPage = () => {
  const { user, token } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', tags: '' });
  const [enhancing, setEnhancing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(`${API}/questions`);
      setQuestions(response.data);
    } catch (error) {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
      await axios.post(`${API}/questions`, {
        title: formData.title,
        description: formData.description,
        tags
      });
      toast.success('✅ Question posted! (-1 point)');
      setDialogOpen(false);
      setFormData({ title: '', description: '', tags: '' });
      fetchQuestions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to post question');
    }
  }

  const handleEnhance = async () => {
    if (!formData.title || !formData.description) {
      toast.error('Please fill in title and description first');
      return;
    }

    setEnhancing(true);
    try {
      const response = await axios.post(`${API}/ai/enhance-question`, {
        title: formData.title,
        description: formData.description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFormData({
        ...formData,
        title: response.data.title,
        description: response.data.description
      });
      toast.success('✨ Question enhanced by AI!');
    } catch (error) {
      console.error('Enhancement failed:', error);
      toast.error('Failed to enhance question');
    } finally {
      setEnhancing(false);
    }
  };

  const handleUpvote = async (e, questionId) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to upvote');
      return;
    }

    try {
      const response = await axios.post(`${API}/questions/${questionId}/upvote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      setQuestions(questions.map(q =>
        q.id === questionId ? { ...q, upvotes: response.data.upvotes } : q
      ));
    } catch (error) {
      toast.error('Failed to upvote');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-yellow-500/10 text-yellow-500',
      answered: 'bg-green-500/10 text-green-500',
      closed: 'bg-gray-500/10 text-gray-500'
    };
    return colors[status] || colors.open;
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">Questions</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#0ea5e9] to-[#14b8a6] text-white btn-primary" data-testid="ask-question-btn">
                <Plus className="h-4 w-4 mr-2" />
                Ask Question
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
              <DialogHeader>
                <DialogTitle>Ask a Question</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAskQuestion} className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <p className="text-sm text-yellow-500">Asking a question costs 1 point</p>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    placeholder="How to..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="bg-[#0a0a0a] border-gray-700"
                    data-testid="question-title-input"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe your question in detail..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={6}
                    className="bg-[#0a0a0a] border-gray-700"
                    data-testid="question-description-input"
                  />
                </div>
                <div>
                  <Label>Tags (comma separated)</Label>
                  <Input
                    placeholder="react, javascript, hooks"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="bg-[#0a0a0a] border-gray-700"
                    data-testid="question-tags-input"
                  />
                </div>
                <Button type="button" onClick={handleEnhance} disabled={enhancing || !formData.title || !formData.description} className="w-full bg-purple-600 hover:bg-purple-700 mb-2">
                  {enhancing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Enhance with AI
                    </>
                  )}
                </Button>
                <Button type="submit" className="w-full bg-primary" data-testid="question-submit-btn" disabled={enhancing}>
                  Post Question
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {questions.length === 0 ? (
            <Card className="bg-[#1a1a1a] border-gray-800 text-center p-12">
              <p className="text-gray-400 mb-4">No questions yet. Be the first to ask!</p>
              <Button onClick={() => setDialogOpen(true)} data-testid="empty-ask-question-btn">Ask Question</Button>
            </Card>
          ) : (
            questions.map((question) => (
              <Card
                key={question.id}
                className="bg-[#1a1a1a] border-gray-800 card-hover cursor-pointer"
                onClick={() => navigate(`/questions/${question.id}`)}
                data-testid={`question-card-${question.id}`}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    {/* Upvote Button */}
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 hover:bg-white/10 ${user && question.upvotes?.includes(user.id) ? 'text-primary' : 'text-gray-400'
                          }`}
                        onClick={(e) => handleUpvote(e, question.id)}
                      >
                        <ChevronUp className="h-6 w-6" />
                      </Button>
                      <span className="text-sm font-medium text-gray-300">
                        {question.upvotes?.length || 0}
                      </span>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getStatusColor(question.status)}>
                          {question.status.toUpperCase()}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2" data-testid={`question-title-${question.id}`}>
                        {question.title}
                      </h3>
                      <p className="text-gray-400 text-sm line-clamp-2">
                        {question.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between pl-12">
                    <div className="flex flex-wrap gap-2">
                      {question.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="border-gray-700 text-gray-300">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>0</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{question.views}</span>
                      </div>
                      <span>{formatDate(question.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionsPage;