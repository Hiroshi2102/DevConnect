import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const CreatePostPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'Tutorial',
    tags: '',
    coverImage: ''
  });
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id) {
      setIsEditing(true);
      fetchPostData();
    }
  }, [id]);

  const fetchPostData = async () => {
    try {
      const response = await axios.get(`${API}/posts/${id}`);
      const post = response.data;
      setFormData({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt || '',
        category: post.category,
        tags: post.tags.join(', '),
        coverImage: post.coverImage || ''
      });
    } catch (error) {
      toast.error('Failed to load post data');
      navigate('/create/post');
    }
  };

  const handleSubmit = async (e, published = true) => {
    e.preventDefault();
    if (published) setLoading(true);
    else setDraftLoading(true);

    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
      const payload = {
        ...formData,
        tags,
        excerpt: formData.excerpt || formData.content.substring(0, 200),
        published
      };

      if (isEditing) {
        await axios.put(`${API}/posts/${id}`, payload);
        toast.success(published ? '🎉 Post updated!' : 'Draft saved!');
      } else {
        const response = await axios.post(`${API}/posts`, payload);
        if (published) {
          navigate(`/posts/${response.data.id}`);
          toast.success('🎉 Post published!');
        } else {
          toast.success('Draft saved!');
          navigate(`/profile/${user?.username}`);
        }
        return; // Early return for create
      }

      // For edit, navigate back to post if published, or profile if draft
      if (published) {
        navigate(`/posts/${id}`);
      } else {
        navigate(`/profile/${user?.username}`);
      }

    } catch (error) {
      toast.error(published ? 'Failed to publish post' : 'Failed to save draft');
    } finally {
      setLoading(false);
      setDraftLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          className="text-gray-400 mb-6"
          onClick={() => navigate(-1)}
          data-testid="back-btn"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold text-white mb-8">{isEditing ? 'Edit Post' : 'Create New Post'}</h1>

        <Card className="bg-[#1a1a1a] border-gray-800 p-6">
          <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-6">
            <div>
              <Label className="text-white">Title</Label>
              <Input
                placeholder="Give your post a catchy title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="bg-[#0a0a0a] border-gray-700 text-white mt-2"
                data-testid="post-title-input"
              />
            </div>

            <div>
              <Label className="text-white">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white mt-2" data-testid="post-category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  <SelectItem value="Tutorial">Tutorial</SelectItem>
                  <SelectItem value="Project">Project</SelectItem>
                  <SelectItem value="OpenSource">Open Source</SelectItem>
                  <SelectItem value="Discussion">Discussion</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Content (Markdown supported)</Label>
              <Textarea
                placeholder="Write your post content here...\n\nSupports markdown:\n- **bold**\n- *italic*\n- `code`\n- ```code blocks```\n- # Headers\n- [links](url)"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={16}
                className="bg-[#0a0a0a] border-gray-700 text-white mt-2 font-mono"
                data-testid="post-content-input"
              />
            </div>

            <div>
              <Label className="text-white">Excerpt (Optional)</Label>
              <Textarea
                placeholder="Brief description of your post..."
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                rows={3}
                className="bg-[#0a0a0a] border-gray-700 text-white mt-2"
                data-testid="post-excerpt-input"
              />
            </div>

            <div>
              <Label className="text-white">Tags (comma separated)</Label>
              <Input
                placeholder="react, javascript, tutorial"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="bg-[#0a0a0a] border-gray-700 text-white mt-2"
                data-testid="post-tags-input"
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-gray-700 text-white hover:bg-gray-800"
                onClick={(e) => handleSubmit(e, false)}
                disabled={draftLoading || loading}
              >
                {draftLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </>
                )}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-[#0ea5e9] to-[#14b8a6] text-white btn-primary"
                disabled={loading || draftLoading}
                data-testid="post-publish-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish Post'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreatePostPage;