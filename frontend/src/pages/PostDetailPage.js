import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/App';
import { useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Heart, Bookmark, Eye, MessageCircle, ThumbsDown, Share2 } from 'lucide-react';
import { formatDate, calculateReadTime } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from '@/components/common/CodeBlock';
import ReportDialog from '@/components/common/ReportDialog';

const PostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [post, setPost] = useState(null);
  const [author, setAuthor] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentAuthors, setCommentAuthors] = useState({});
  const [commentContent, setCommentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [id]);

  const fetchPost = async () => {
    try {
      const response = await axios.get(`${API}/posts/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setPost(response.data);

      // Check if current user has liked the post
      if (user && response.data.likes.includes(user.id)) {
        setLiked(true);
      }

      if (user && response.data.bookmarks.includes(user.id)) {
        setBookmarked(true);
      }

      // Fetch author data
      fetchAuthor(response.data.authorId);
    } catch (error) {
      console.error('Error fetching post:', error);
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuthor = async (authorId) => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      // For now, we'll use the current user's data as a placeholder
      // In a real app, you'd fetch by authorId
      setAuthor(response.data);
    } catch (error) {
      console.error('Failed to load author');
    }
  };

  const fetchComments = async () => {
    try {
      const response = await axios.get(`${API}/posts/${id}/comments`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setComments(response.data);

      // Fetch authors for each comment
      const authors = {};
      for (const comment of response.data) {
        try {
          // In a real implementation, you'd have an endpoint to fetch user by ID
          // For now, we'll use the current user as placeholder
          authors[comment.userId] = user;
        } catch (error) {
          console.error(`Failed to load author for comment ${comment.id}`);
        }
      }
      setCommentAuthors(authors);
    } catch (error) {
      console.error('Failed to load comments');
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please login to like posts');
      return;
    }

    try {
      await axios.post(`${API}/posts/${id}/like`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setLiked(!liked);

      // Update local state optimistically
      setPost(prev => ({
        ...prev,
        likes: liked
          ? prev.likes.filter(userId => userId !== user.id)
          : [...prev.likes, user.id]
      }));

      toast.success(liked ? 'Like removed' : '❤️ Post liked! (+10 points)');
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('Failed to like post');
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.error('Please login to bookmark posts');
      return;
    }

    try {
      await axios.post(`${API}/posts/${id}/bookmark`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setBookmarked(!bookmarked);

      // Update local state optimistically
      setPost(prev => ({
        ...prev,
        bookmarks: bookmarked
          ? prev.bookmarks.filter(userId => userId !== user.id)
          : [...prev.bookmarks, user.id]
      }));

      toast.success(bookmarked ? 'Bookmark removed' : '🔖 Post bookmarked');
    } catch (error) {
      console.error('Error bookmarking post:', error);
      toast.error('Failed to bookmark post');
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    if (!user) {
      toast.error('Please login to comment');
      return;
    }

    try {
      await axios.post(`${API}/comments`, {
        postId: id,
        content: commentContent
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success('✅ Comment posted! (+5 points)');
      setCommentContent('');
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
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

  if (!post) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="text-center py-20">
          <p className="text-gray-400">Post not found</p>
          <Button
            onClick={() => navigate('/feed')}
            className="mt-4"
          >
            Go back to Feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          className="text-gray-400 mb-6 hover:text-white"
          onClick={() => navigate('/feed')}
          data-testid="back-to-feed-btn"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Feed
        </Button>

        <article>
          <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20" data-testid="post-detail-category">
                  {post.category}
                </Badge>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {post.views}
                  </div>
                  <span>{calculateReadTime(post.content)}</span>
                </div>
              </div>

              <h1 className="text-4xl font-bold text-white mb-6" data-testid="post-detail-title">
                {post.title}
              </h1>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`} />
                    <AvatarFallback>{author?.name?.[0] || 'A'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {author?.name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(post.createdAt)}</p>
                  </div>
                </div>
              </div>

              {post.coverImage && (
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-96 object-cover rounded-lg"
                />
              )}
            </CardHeader>

            <CardContent>
              <div className="prose prose-invert prose-lg max-w-none mb-8">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline ? (
                        <div className="my-4 rounded-lg overflow-hidden">
                          <CodeBlock
                            language={match ? match[1] : 'javascript'}
                            code={String(children).replace(/\n$/, '')}
                          />
                        </div>
                      ) : (
                        <code className="bg-[#282c34] text-[#abb2bf] px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {post.content}
                </ReactMarkdown>
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 sm:gap-4 border-t border-gray-800 pt-4 sm:pt-6 mt-6 sm:mt-8">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-gray-400 hover:text-red-500 h-9 text-xs sm:text-sm ${liked ? 'text-red-500' : ''}`}
                  onClick={handleLike}
                >
                  <Heart className={`h-4 w-4 mr-1 sm:mr-2 ${liked ? 'fill-current' : ''}`} />
                  {post.likes.length}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-gray-400 hover:text-blue-500 h-9 text-xs sm:text-sm ${bookmarked ? 'text-blue-500' : ''}`}
                  onClick={handleBookmark}
                >
                  <Bookmark className={`h-4 w-4 mr-1 sm:mr-2 ${bookmarked ? 'fill-current' : ''}`} />
                  <span className="hidden xs:inline">{bookmarked ? 'Saved' : 'Save'}</span>
                  <span className="inline xs:hidden">{bookmarked ? '✓' : 'Save'}</span>
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-9 text-xs sm:text-sm">
                  <Share2 className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Share</span>
                </Button>
                <ReportDialog targetId={post.id} targetType="post" />
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
            <CardHeader>
              <h2 className="text-2xl font-bold text-white">
                {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
              </h2>
            </CardHeader>
            <CardContent>
              {user ? (
                <form onSubmit={handleSubmitComment} className="mb-6">
                  <Textarea
                    placeholder="Write a comment..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    rows={4}
                    className="bg-[#0a0a0a] border-gray-700 text-white mb-3 focus:border-primary"
                    data-testid="comment-textarea"
                  />
                  <Button
                    type="submit"
                    disabled={!commentContent.trim()}
                    className="bg-gradient-to-r from-[#0ea5e9] to-[#14b8a6] hover:opacity-90"
                    data-testid="submit-comment-btn"
                  >
                    Post Comment (+5 points)
                  </Button>
                </form>
              ) : (
                <div className="mb-6 p-4 bg-[#0a0a0a] rounded-lg border border-gray-800">
                  <p className="text-gray-400 text-center">
                    Please <button onClick={() => navigate('/login')} className="text-primary hover:underline">login</button> to comment
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3 p-4 bg-[#0a0a0a] rounded-lg border border-gray-800/50" data-testid={`comment-${comment.id}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={commentAuthors[comment.userId]?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`} />
                      <AvatarFallback>{commentAuthors[comment.userId]?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-white">
                          {commentAuthors[comment.userId]?.name || 'Anonymous'}
                        </p>
                        <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-300">{comment.content}</p>
                    </div>
                  </div>
                ))}

                {comments.length === 0 && (
                  <p className="text-center text-gray-400 py-8">No comments yet. Be the first to comment!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </article>
      </div>
    </div>
  );
};

export default PostDetailPage;