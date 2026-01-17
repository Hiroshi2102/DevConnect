import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/App';
import { useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Github, Linkedin, Globe, Settings, Trophy, Bookmark, MessageCircle, Heart, Eye, Award, FileEdit, Star, GitFork } from 'lucide-react';
import BadgeIcon from '@/components/common/BadgeIcon';
import { formatDate, calculateReadTime } from '@/lib/utils';
import { getRankColor } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from '@/components/common/CodeBlock';

const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [trophies, setTrophies] = useState([]);
  const [repos, setRepos] = useState([]);
  const [badgeDefinitions, setBadgeDefinitions] = useState({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [userPosts, setUserPosts] = useState([]);
  const [userQuestions, setUserQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  const isCurrentUser = currentUser && profileUser && currentUser.id === profileUser.id;

  useEffect(() => {
    if (username === 'me') {
      if (!authLoading) {
        if (currentUser) {
          navigate(`/profile/${currentUser.username}`, { replace: true });
        } else {
          navigate('/login');
        }
      }
      return;
    }
    if (authLoading) return;

    fetchProfile();
  }, [username, currentUser, authLoading]);

  const fetchProfile = async () => {
    try {
      const [userRes, statsRes, trophiesRes, badgesRes, reposRes, postsRes, questionsRes, answersRes] = await Promise.all([
        axios.get(`${API}/users/${username}`),
        axios.get(`${API}/users/${username}/stats`),
        axios.get(`${API}/users/${username}/trophies`),
        axios.get(`${API}/badges`),
        axios.get(`${API}/users/${username}/github/repos`),
        axios.get(`${API}/users/${username}/posts`),
        axios.get(`${API}/users/${username}/questions`),
        axios.get(`${API}/users/${username}/answers`)
      ]);
      setProfileUser(userRes.data);
      setStats(statsRes.data);
      setTrophies(trophiesRes.data);
      setBadgeDefinitions(badgesRes.data);
      setRepos(reposRes.data);
      setUserPosts(postsRes.data);
      setUserQuestions(questionsRes.data);
      setUserAnswers(answersRes.data);
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const response = await axios.get(`${API}/posts/bookmarked`);
      setBookmarkedPosts(response.data);
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
      toast.error('Failed to load bookmarks');
    }
  };

  const fetchDrafts = async () => {
    try {
      const response = await axios.get(`${API}/posts/drafts`);
      setDrafts(response.data);
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
      toast.error('Failed to load drafts');
    }
  };

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (profileUser && currentUser) {
      setIsFollowing(profileUser.followers?.includes(currentUser.id));
    }
  }, [profileUser, currentUser]);

  const handleFollow = async () => {
    if (!currentUser) {
      toast.error('Please login to follow users');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await axios.delete(`${API}/users/${profileUser.id}/follow`);
        toast.success('Unfollowed successfully');
        setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
      } else {
        await axios.post(`${API}/users/${profileUser.id}/follow`);
        toast.success('Followed successfully');
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      toast.error(isFollowing ? 'Failed to unfollow' : 'Failed to follow');
    } finally {
      setFollowLoading(false);
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

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="text-center py-20">
          <p className="text-gray-400">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4">
          {/* Profile Header */}
          <Card className="bg-[#1a1a1a] border-gray-800 mb-2 sm:mb-3">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex flex-col md:flex-row items-start gap-4 sm:gap-6">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 md:h-32 md:w-32 shrink-0">
                  <AvatarImage src={profileUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUser.username}`} />
                  <AvatarFallback className="text-2xl sm:text-3xl md:text-4xl">{profileUser.name.charAt(0)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                    <div className="min-w-0 flex-1">
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 truncate" data-testid="profile-name">{profileUser.name}</h1>
                      <p className="text-sm sm:text-base text-gray-400 truncate" data-testid="profile-username">@{profileUser.username}</p>
                      {isCurrentUser ? (
                        <Button
                          variant="outline"
                          onClick={() => navigate('/profile/edit')}
                          className="border-gray-700 text-white hover:bg-gray-900 mt-3 sm:mt-4 text-sm sm:text-base h-9 sm:h-10"
                          data-testid="profile-edit-btn"
                        >
                          <Settings className="h-4 w-4 mr-1 sm:mr-2" />
                          <span className="hidden xs:inline">Profile </span>Settings
                        </Button>
                      ) : (
                        <Button
                          onClick={handleFollow}
                          disabled={followLoading}
                          className={`mt-3 sm:mt-4 text-sm sm:text-base h-9 sm:h-10 ${isFollowing ? 'bg-gray-700 hover:bg-gray-600' : 'bg-primary hover:bg-primary/90'}`}
                          data-testid="profile-follow-btn"
                        >
                          {isFollowing ? 'Unfollow' : 'Follow'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {profileUser.bio && (
                    <p className="text-sm sm:text-base text-gray-300 mb-3 sm:mb-4" data-testid="profile-bio">{profileUser.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-2 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm text-gray-400">
                    {profileUser.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {profileUser.location}
                      </div>
                    )}
                    {profileUser.githubUrl && (
                      <a href={profileUser.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                        <Github className="h-4 w-4" />
                        GitHub
                      </a>
                    )}
                    {profileUser.linkedinUrl && (
                      <a href={profileUser.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                        <Linkedin className="h-4 w-4" />
                        LinkedIn
                      </a>
                    )}
                    {profileUser.websiteUrl && (
                      <a href={profileUser.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                        <Globe className="h-4 w-4" />
                        Website
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3 sm:mb-4 -mx-2 px-2 overflow-x-auto scrollbar-hide">
                    {(profileUser.skills || []).map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="border-gray-700 text-gray-300 shrink-0">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-4 md:gap-6">
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-primary" data-testid="profile-points">{profileUser.points}</div>
                      <div className="text-xs sm:text-sm text-gray-400">Points</div>
                    </div>
                    <div>
                      <Badge className={`${getRankColor(profileUser.rank)} px-2 sm:px-4 py-0.5 sm:py-1 text-sm sm:text-lg`} data-testid="profile-rank">
                        {profileUser.rank}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-secondary" data-testid="profile-trophies">{trophies.length}</div>
                      <div className="text-xs sm:text-sm text-gray-400">Trophies</div>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-white" data-testid="profile-followers">{stats?.followers || 0}</div>
                      <div className="text-xs sm:text-sm text-gray-400">Followers</div>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-white" data-testid="profile-following">{stats?.following || 0}</div>
                      <div className="text-xs sm:text-sm text-gray-400">Following</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 mb-2 sm:mb-3">
            <Card className="bg-[#1a1a1a] border-gray-800">
              <CardContent className="p-3 sm:p-4 md:p-6 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary" data-testid="profile-posts-count">{stats?.posts || 0}</div>
                <div className="text-xs sm:text-sm text-gray-400 mt-1">Posts</div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a1a] border-gray-800">
              <CardContent className="p-3 sm:p-4 md:p-6 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-secondary" data-testid="profile-questions-count">{stats?.questions || 0}</div>
                <div className="text-xs sm:text-sm text-gray-400 mt-1">Questions</div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a1a] border-gray-800">
              <CardContent className="p-3 sm:p-4 md:p-6 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary" data-testid="profile-answers-count">{stats?.answers || 0}</div>
                <div className="text-xs sm:text-sm text-gray-400 mt-1">Answers</div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a1a] border-gray-800">
              <CardContent className="p-3 sm:p-4 md:p-6 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-secondary" data-testid="profile-trophies-count">{stats?.trophies || 0}</div>
                <div className="text-xs sm:text-sm text-gray-400 mt-1">Trophies</div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a1a] border-gray-800">
              <CardContent className="p-3 sm:p-4 md:p-6 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white" data-testid="profile-views-count">{profileUser.profileViews || 0}</div>
                <div className="text-xs sm:text-sm text-gray-400 mt-1">Profile Views</div>
              </CardContent>
            </Card>
          </div>

          {/* Badges */}
          {profileUser.badges && profileUser.badges.length > 0 && (
            <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-white">Badges</h2>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {profileUser.badges.map((badgeId) => (
                    <div key={badgeId} className="flex flex-col items-center gap-2">
                      <BadgeIcon
                        badgeId={badgeId}
                        size="lg"
                        description={badgeDefinitions[badgeId]?.description}
                      />
                      <span className="text-xs text-gray-400">{badgeDefinitions[badgeId]?.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trophies */}
          {trophies.length > 0 && (
            <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-white">Trophies</h2>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trophies.map((trophy) => (
                    <div key={trophy.id} className="bg-[#0a0a0a] p-4 rounded-lg border border-gray-800" data-testid={`trophy-${trophy.type}`}>
                      <div className="text-4xl mb-2 trophy-icon">{trophy.icon}</div>
                      <h3 className="font-semibold text-white mb-1">{trophy.title}</h3>
                      <p className="text-sm text-gray-400">{trophy.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Tabs */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="bg-[#1a1a1a] w-full justify-start overflow-x-auto flex-nowrap">
              <TabsTrigger value="posts" data-testid="tab-posts" className="text-xs sm:text-sm">Posts</TabsTrigger>
              <TabsTrigger value="questions" data-testid="tab-questions" className="text-xs sm:text-sm">Questions</TabsTrigger>
              <TabsTrigger value="answers" data-testid="tab-answers" className="text-xs sm:text-sm">Answers</TabsTrigger>
              <TabsTrigger value="repos" data-testid="tab-repos" className="text-xs sm:text-sm">Repos</TabsTrigger>
              {isCurrentUser && <TabsTrigger value="bookmarks" onClick={fetchBookmarks} data-testid="tab-bookmarks" className="text-xs sm:text-sm">Bookmarks</TabsTrigger>}
              {isCurrentUser && <TabsTrigger value="drafts" onClick={fetchDrafts} data-testid="tab-drafts" className="text-xs sm:text-sm">Drafts</TabsTrigger>}
            </TabsList>
            <div className="max-h-[calc(100vh-28rem)] sm:max-h-[calc(100vh-26rem)] overflow-y-auto mt-3">
              <TabsContent value="posts" className="mt-0">
                {userPosts.length === 0 ? (
                  <Card className="bg-[#1a1a1a] border-gray-800 p-12 text-center">
                    <p className="text-gray-400">No posts yet</p>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {userPosts.map((post) => (
                      <Card
                        key={post.id}
                        className="bg-[#1a1a1a] border-gray-800 card-hover cursor-pointer transition-all"
                        onClick={() => navigate(`/posts/${post.id}`)}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`} />
                                <AvatarFallback>A</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium text-white">{profileUser.name}</p>
                                <p className="text-xs text-gray-400">{formatDate(post.createdAt)}</p>
                              </div>
                            </div>
                            <Badge className="bg-primary/10 text-primary">{post.category}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <h2 className="text-xl font-semibold text-white mb-2">{post.title}</h2>
                          {post.excerpt && <p className="text-gray-400 mb-4 line-clamp-2">{post.excerpt}</p>}
                          <div className="flex flex-wrap gap-2">
                            {post.tags?.map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="border-gray-700 text-gray-300">#{tag}</Badge>
                            ))}
                          </div>
                        </CardContent>
                        <CardContent className="pb-2 pt-0">
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-1"><Heart className="h-4 w-4" /> {post.likes?.length || 0}</div>
                            <div className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {post.commentsCount || 0}</div>
                            <div className="flex items-center gap-1"><Eye className="h-4 w-4" /> {post.views || 0}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="questions" className="mt-0">
                {userQuestions.length === 0 ? (
                  <Card className="bg-[#1a1a1a] border-gray-800 p-12 text-center">
                    <p className="text-gray-400">No questions yet</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {userQuestions.map((question) => (
                      <Card
                        key={question.id}
                        className="bg-[#1a1a1a] border-gray-800 hover:border-gray-700 transition-all cursor-pointer"
                        onClick={() => navigate(`/questions/${question.id}`)}
                      >
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-semibold text-white hover:text-primary transition-colors">{question.title}</h3>
                            <Badge className={question.status === 'solved' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}>
                              {question.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {question.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-[#2a2a2a] text-blue-400">#{tag}</Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span>{formatDate(question.createdAt)}</span>
                            <div className="flex items-center gap-1"><Eye className="h-4 w-4" /> {question.views}</div>
                            <div className="flex items-center gap-1"><Heart className="h-4 w-4" /> {question.upvotes?.length || 0}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="answers" className="mt-0">
                {userAnswers.length === 0 ? (
                  <Card className="bg-[#1a1a1a] border-gray-800 p-12 text-center">
                    <p className="text-gray-400">No answers yet</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {userAnswers.map((answer) => (
                      <Card
                        key={answer.id}
                        className="bg-[#1a1a1a] border-gray-800 hover:border-gray-700 transition-all cursor-pointer"
                        onClick={() => navigate(`/questions/${answer.questionId}`)}
                      >
                        <CardContent className="p-6">
                          <div className="prose prose-invert max-w-none mb-4">
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
                                }
                              }}
                            >
                              {answer.content
                                .replace(/'''|```/g, '\n```\n')}
                            </ReactMarkdown>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-400">
                            <span>Answered on {formatDate(answer.createdAt)}</span>
                            <div className="flex items-center gap-1"><Heart className="h-4 w-4" /> {answer.upvotes?.length || 0}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="repos" className="mt-0">
                {repos.length === 0 ? (
                  <Card className="bg-[#1a1a1a] border-gray-800 p-12 text-center">
                    <Github className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No repositories found</p>
                    {isCurrentUser && !profileUser.githubUrl && (
                      <Button variant="link" onClick={() => navigate('/profile/edit')} className="text-primary mt-2">
                        Connect GitHub Account
                      </Button>
                    )}
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {repos.map((repo) => (
                      <Card key={repo.url} className="bg-[#1a1a1a] border-gray-800 hover:border-gray-700 transition-all">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-2">
                            <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-primary hover:underline flex items-center gap-2">
                              <Github className="h-4 w-4" />
                              {repo.name}
                            </a>
                            <div className="flex items-center gap-1 text-gray-400 text-sm">
                              <Star className="h-4 w-4 text-yellow-500" />
                              {repo.stars}
                            </div>
                          </div>
                          <p className="text-gray-400 text-sm mb-4 line-clamp-2">{repo.description || "No description"}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                              {repo.language && (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                  {repo.language}
                                </span>
                              )}
                            </div>
                            <span>Updated {formatDate(repo.updatedAt)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {isCurrentUser && (
                <TabsContent value="bookmarks" className="mt-0">
                  {bookmarkedPosts.length === 0 ? (
                    <Card className="bg-[#1a1a1a] border-gray-800 p-12 text-center">
                      <p className="text-gray-400">No bookmarks yet</p>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {bookmarkedPosts.map((post) => (
                        <Card
                          key={post.id}
                          className="bg-[#1a1a1a] border-gray-800 card-hover cursor-pointer transition-all"
                          onClick={() => navigate(`/posts/${post.id}`)}
                        >
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`} />
                                  <AvatarFallback>A</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium text-white">Author</p>
                                  <p className="text-xs text-gray-400">{formatDate(post.createdAt)}</p>
                                </div>
                              </div>
                              <Badge className="bg-primary/10 text-primary">{post.category}</Badge>
                            </div>
                          </CardHeader>

                          <CardContent>
                            <h2 className="text-xl font-semibold text-white mb-2">{post.title}</h2>
                            {post.excerpt && (
                              <p className="text-gray-400 mb-4">{post.excerpt}</p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {post.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="border-gray-700 text-gray-300">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>

                          <CardContent className="pb-2">
                            <div className="flex items-center justify-between text-sm text-gray-400">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-1">
                                  <Heart className="h-4 w-4" />
                                  <span>{post.likes.length}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MessageCircle className="h-4 w-4" />
                                  <span>{post.commentsCount || 0}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Eye className="h-4 w-4" />
                                  <span>{post.views}</span>
                                </div>
                              </div>
                              <span>{calculateReadTime(post.content)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              )}

              {isCurrentUser && (
                <TabsContent value="drafts" className="mt-0">
                  {drafts.length === 0 ? (
                    <Card className="bg-[#1a1a1a] border-gray-800 p-12 text-center">
                      <p className="text-gray-400">No drafts saved</p>
                      <Button variant="link" onClick={() => navigate('/create/post')} className="text-primary mt-2">
                        Create a new post
                      </Button>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {drafts.map((draft) => (
                        <Card
                          key={draft.id}
                          className="bg-[#1a1a1a] border-gray-800 card-hover cursor-pointer transition-all border-l-4 border-l-yellow-500"
                          onClick={() => navigate(`/posts/${draft.id}/edit`)}
                        >
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">Draft</Badge>
                                <p className="text-xs text-gray-400">Last updated: {formatDate(draft.updatedAt)}</p>
                              </div>
                              <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                                <FileEdit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            </div>
                          </CardHeader>

                          <CardContent>
                            <h2 className="text-xl font-semibold text-white mb-2">{draft.title || 'Untitled Draft'}</h2>
                            {draft.excerpt && (
                              <p className="text-gray-400 mb-4">{draft.excerpt}</p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {draft.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="border-gray-700 text-gray-300">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;