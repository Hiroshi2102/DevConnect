import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Bookmark, Eye, Plus } from 'lucide-react';
import { formatDate, calculateReadTime } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import CodeBlock from '@/components/common/CodeBlock';
import TrendingPosts from '@/components/common/TrendingPosts';

const FeedPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('foryou');

  useEffect(() => {
    fetchPosts('foryou');
  }, []);

  const fetchPosts = async (tab = activeTab) => {
    setLoading(true);
    try {
      let endpoint = `${API}/posts/feed?limit=20`;
      if (tab === 'trending') {
        endpoint = `${API}/posts/trending?limit=20`;
      } else if (tab === 'following') {
        endpoint = `${API}/posts/following?limit=20`;
      }

      const response = await axios.get(endpoint);
      setPosts(response.data);
    } catch (error) {
      console.error("Error fetching posts:", error);
      // Don't show error for empty following feed, just show empty state
      if (tab !== 'following') {
        toast.error('Failed to load posts');
      } else {
        setPosts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId, e) => {
    e.stopPropagation();
    try {
      await axios.post(`${API}/posts/${postId}/like`);
      // Update local state
      setPosts(posts.map(post => {
        if (post.id === postId) {
          const liked = post.likes.includes('current-user');
          return {
            ...post,
            likes: liked
              ? post.likes.filter(id => id !== 'current-user')
              : [...post.likes, 'current-user']
          };
        }
        return post;
      }));
    } catch (error) {
      toast.error('Failed to like post');
    }
  };

  const handleBookmark = async (postId, e) => {
    e.stopPropagation();
    try {
      await axios.post(`${API}/posts/${postId}/bookmark`);

      setPosts(posts.map(post => {
        if (post.id === postId) {
          const isBookmarked = post.bookmarks.includes(user?.id);
          return {
            ...post,
            bookmarks: isBookmarked
              ? post.bookmarks.filter(id => id !== user?.id)
              : [...post.bookmarks, user?.id]
          };
        }
        return post;
      }));

      const post = posts.find(p => p.id === postId);
      const isBookmarked = post.bookmarks.includes(user?.id);
      toast.success(isBookmarked ? 'Post removed from bookmarks' : 'Post bookmarked');
    } catch (error) {
      toast.error('Failed to bookmark post');
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

      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 md:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Feed</h1>
              <Button
                className="bg-gradient-to-r from-[#0ea5e9] to-[#14b8a6] text-white btn-primary text-sm sm:text-base h-9 sm:h-10"
                onClick={() => navigate('/create/post')}
                data-testid="create-post-btn"
              >
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Create </span>Post
              </Button>
            </div>

            <div className="mb-4 sm:mb-6">
              <div className="flex space-x-2 sm:space-x-4 border-b border-gray-800 overflow-x-auto">
                {['foryou', 'following', 'trending'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      fetchPosts(tab);
                    }}
                    className={`pb-2 sm:pb-3 px-1 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === tab ? 'text-primary' : 'text-gray-400 hover:text-gray-300'
                      }`}
                  >
                    {tab === 'foryou' ? 'For You' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {posts.length === 0 ? (
                <Card className="bg-[#1a1a1a] border-gray-800 text-center p-12">
                  <p className="text-gray-400 mb-4">No posts yet. Be the first to share something!</p>
                  <Button onClick={() => navigate('/create/post')} data-testid="empty-create-post-btn">
                    Create Post
                  </Button>
                </Card>
              ) : (
                posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {console.log("HUGE_DEBUG_STRING_XYZ_123")}
                    {console.log("DEBUG POST:", post)}
                    <Card
                      className="bg-[#1a1a1a] border-gray-800 card-hover cursor-pointer transition-all"
                      onClick={() => navigate(`/posts/${post.id}`)}
                      data-testid={`post-card-${post.id}`}
                    >
                      <CardHeader className="p-3 sm:p-4 md:p-6">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`} />
                              <AvatarFallback>A</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-white truncate">Author</p>
                              <p className="text-[10px] sm:text-xs text-gray-400 truncate">{formatDate(post.createdAt)}</p>
                            </div>
                          </div>
                          <Badge className="bg-primary/10 text-primary text-xs shrink-0" data-testid={`post-category-${post.id}`}>{post.category}</Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                        <h2 className="text-lg sm:text-xl font-semibold text-white mb-2" data-testid={`post-title-${post.id}`}>{post.title}</h2>
                        {post.excerpt && (
                          <div className="text-gray-400 mb-4 line-clamp-3">
                            <ReactMarkdown
                              components={{
                                code({ node, inline, className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return !inline ? (
                                    <div className="my-2" onClick={(e) => e.stopPropagation()}>
                                      <CodeBlock
                                        language={match ? match[1] : undefined}
                                        code={String(children).replace(/\n$/, '')}
                                      />
                                    </div>
                                  ) : (
                                    <code className="bg-[#282c34] text-[#abb2bf] px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                // Disable other markdown elements for excerpt to keep it clean, or allow them
                                p: ({ node, ...props }) => <p {...props} className="mb-2" />,
                              }}
                            >
                              {/* If excerpt is just plain text, this might not render code blocks unless excerpt contains markdown. 
                                   If excerpt is generated from content, it might strip markdown. 
                                   Let's assume for now we want to show a preview of content if excerpt is missing or just use content truncated.
                                   But the user asked for it to be visible in feed. 
                                   If the backend generates plain text excerpts, we might need to use post.content truncated.
                                   Let's try using post.content truncated if excerpt is not markdown-rich, or just render excerpt as markdown.
                               */
                                post.content.length > 300 ? post.content.substring(0, 300) + "..." : post.content
                              }
                            </ReactMarkdown>
                          </div>
                        )}
                        {post.coverImage && (
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-48 object-cover rounded-lg mb-4"
                          />
                        )}
                        <div className="flex flex-wrap gap-2">
                          {post.tags?.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="border-gray-700 text-gray-300">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>

                      <CardFooter className="flex items-center justify-between text-xs sm:text-sm text-gray-400 p-3 sm:p-4 md:p-6">
                        <div className="flex items-center space-x-2 sm:space-x-4">
                          <button
                            className="flex items-center space-x-1 hover:text-primary transition-colors"
                            onClick={(e) => handleLike(post.id, e)}
                            data-testid={`post-like-btn-${post.id}`}
                          >
                            <Heart className="h-4 w-4" />
                            <span>{post.likes?.length || 0}</span>
                          </button>
                          <div className="flex items-center space-x-1">
                            {console.log("DEBUG POST:", post)}
                            <MessageCircle className="h-4 w-4" />
                            <span>{post['commentsCount'] || 0}</span>
                          </div>
                          <button
                            className={`flex items-center space-x-1 transition-colors ${post.bookmarks?.includes(user?.id) ? 'text-blue-500' : 'hover:text-secondary'}`}
                            onClick={(e) => handleBookmark(post.id, e)}
                            data-testid={`post-bookmark-btn-${post.id}`}
                          >
                            <Bookmark className={`h-4 w-4 ${post.bookmarks?.includes(user?.id) ? 'fill-current' : ''}`} />
                          </button>
                          <div className="flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            <span>{post.views}</span>
                          </div>
                        </div>
                        <span>{calculateReadTime(post.content)}</span>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block lg:col-span-4">
            <TrendingPosts />
            <TrendingTagsWidget />

            <WhoToFollowWidget />
            <TopContributorsWidget />
          </div>
        </div>
      </div>
    </div>
  );
};

const TopContributorsWidget = () => {
  const [contributors, setContributors] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContributors = async () => {
      try {
        const response = await axios.get(`${API}/leaderboard?limit=5`);
        setContributors(response.data);
      } catch (error) {
        console.error("Error fetching contributors:", error);
      }
    };
    fetchContributors();
  }, []);

  if (contributors.length === 0) return null;

  return (
    <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
      <CardHeader>
        <h3 className="font-semibold text-white">Top Contributors</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {contributors.map((user, index) => (
            <div key={user.id} className="flex items-center justify-between cursor-pointer" onClick={() => navigate(`/profile/${user.username}`)}>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="h-10 w-10 border border-gray-700">
                    <AvatarImage src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                    <AvatarFallback>{user.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    #{index + 1}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white hover:text-primary transition-colors">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.points} points</p>
                </div>
              </div>
              <Badge variant="outline" className="border-gray-700 text-xs text-gray-400">
                {user.rank}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const WhoToFollowWidget = () => {
  const [users, setUsers] = useState([]);
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) return;
      try {
        // Fetch top users to recommend
        const response = await axios.get(`${API}/leaderboard?limit=20`);
        // Filter out current user and already followed users
        const recommended = response.data
          .filter(u => u.id !== currentUser.id && !currentUser.following?.includes(u.id))
          .slice(0, 3); // Show top 3 recommendations
        setUsers(recommended);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      }
    };
    fetchUsers();
  }, [currentUser]);

  const handleFollow = async (userId) => {
    try {
      await axios.post(`${API}/users/${userId}/follow`);
      toast.success('Followed successfully');
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      toast.error('Failed to follow user');
    }
  };

  if (!currentUser || users.length === 0) return null;

  return (
    <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
      <CardHeader>
        <h3 className="font-semibold text-white">Who to Follow</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate(`/profile/${user.username}`)}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                  <AvatarFallback>{user.username[0]}</AvatarFallback>
                </Avatar>
                <div className="max-w-[100px]">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white"
                onClick={() => handleFollow(user.id)}
              >
                Follow
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};



const TrendingTagsWidget = () => {
  const [tags, setTags] = useState([]);
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await axios.get(`${API}/tags/trending`);
        setTags(response.data);
      } catch (error) {
        console.error("Error fetching trending tags:", error);
      }
    };
    fetchTags();
  }, []);

  const handleFollowTag = async (tag, e) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to follow tags');
      return;
    }

    const isFollowing = user.followingTags?.includes(tag);
    try {
      if (isFollowing) {
        await axios.delete(`${API}/tags/${tag}/follow`);
        toast.success(`Unfollowed #${tag}`);
        updateUser({
          ...user,
          followingTags: (user.followingTags || []).filter(t => t !== tag)
        });
      } else {
        await axios.post(`${API}/tags/${tag}/follow`);
        toast.success(`Followed #${tag}`);
        updateUser({
          ...user,
          followingTags: [...(user.followingTags || []), tag]
        });
      }
    } catch (error) {
      toast.error('Failed to update tag follow status');
    }
  };

  if (tags.length === 0) return null;

  return (
    <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
      <CardHeader>
        <h3 className="font-semibold text-white">Trending Tags</h3>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tags.map(({ tag, count }) => {
            const isFollowing = user?.followingTags?.includes(tag);
            return (
              <Badge
                key={tag}
                variant={isFollowing ? "default" : "outline"}
                className={`cursor-pointer transition-all ${isFollowing
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-700 text-gray-300 hover:border-primary hover:text-primary'
                  }`}
                onClick={(e) => handleFollowTag(tag, e)}
              >
                #{tag}
                {count > 1 && <span className="ml-1 text-[10px] opacity-60">({count})</span>}
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedPage;