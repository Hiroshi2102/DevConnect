import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/App';
import { API } from '@/App';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Menu, Search, LogOut, User, Settings, MessageSquare, X, Shield, Code, Briefcase } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

import { AnimatePresence, motion } from 'framer-motion';

import NotificationsDropdown from '@/components/layout/NotificationsDropdown';

const Navbar = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState({ posts: [], users: [], tags: [] });
  const [searchLoading, setSearchLoading] = useState(false);

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced autocomplete
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setSearchLoading(true);
        try {
          const response = await axios.get(`${API}/search/autocomplete`, {
            params: { query: searchQuery },
            headers: { Authorization: `Bearer ${token}` }
          });
          setSuggestions(response.data);
        } catch (error) {
          console.error('Autocomplete failed', error);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSuggestions({ posts: [], users: [], tags: [] });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      return;
    }

    // Redirect to search page
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMobileNavClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-lg border-b border-[#2a2a2a]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/feed" className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#0ea5e9] to-[#14b8a6] rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg sm:text-xl">D</span>
            </div>
            <span className="text-lg sm:text-xl font-bold text-white hidden xs:inline truncate">DevConnect</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
            <Link
              to="/feed"
              className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/feed' ? 'text-primary nav-active' : 'text-gray-300'
                }`}
              data-testid="nav-feed"
            >
              Feed
            </Link>
            <Link
              to="/questions"
              className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/questions' ? 'text-primary nav-active' : 'text-gray-300'
                }`}
              data-testid="nav-questions"
            >
              Questions
            </Link>
            <Link
              to="/challenges"
              className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/challenges' ? 'text-primary nav-active' : 'text-gray-300'
                } flex items-center gap-1`}
              data-testid="nav-challenges"
            >
              <Code className="h-4 w-4" />
              <span className="hidden lg:inline">Challenges</span>
            </Link>
            <Link
              to="/projects"
              className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname.startsWith('/projects') ? 'text-primary nav-active' : 'text-gray-300'
                } flex items-center gap-1`}
              data-testid="nav-projects"
            >
              <Briefcase className="h-4 w-4" />
              <span className="hidden lg:inline">Projects</span>
            </Link>
            <Link
              to="/leaderboard"
              className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/leaderboard' ? 'text-primary nav-active' : 'text-gray-300'
                }`}
              data-testid="nav-leaderboard"
            >
              Leaderboard
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            {/* Search - Desktop and Tablet */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex text-gray-400 hover:text-white h-9 w-9 sm:h-10 sm:w-10"
              onClick={() => setSearchOpen(true)}
              data-testid="search-button"
            >
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            {/* Messages - Desktop and Tablet */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex text-gray-400 hover:text-white relative h-9 w-9 sm:h-10 sm:w-10"
              onClick={() => navigate('/messages')}
              data-testid="messages-button"
            >
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            {/* Notifications - Desktop and Tablet */}
            <div className="hidden sm:block">
              <NotificationsDropdown />
            </div>

            {/* User Menu - Desktop and Tablet */}
            <div className="hidden sm:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full" data-testid="user-menu-button">
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                      <AvatarImage src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} />
                      <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">@{user?.username}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="text-xs">{user?.rank}</Badge>
                        <span className="text-xs text-muted-foreground">{user?.points} points</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(`/profile/${user?.username}`)} data-testid="menu-profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  {user?.role === 'admin' && (
                    <DropdownMenuItem onClick={() => navigate('/admin')} data-testid="menu-admin">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin Panel</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Hamburger Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden text-gray-400 hover:text-white h-9 w-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-button"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Slide-in */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="sm:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="sm:hidden fixed right-0 top-14 w-64 bg-[#0a0a0a] border-l border-gray-800 z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto"
            >
              <div className="p-4 space-y-4">
                {/* User Info */}
                <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} />
                    <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                    <p className="text-xs text-gray-400 truncate">@{user?.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="text-xs">{user?.rank}</Badge>
                      <span className="text-xs text-gray-400">{user?.points} pts</span>
                    </div>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="space-y-0.5">
                  <button
                    onClick={() => handleMobileNavClick('/feed')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/feed' ? 'bg-primary/20 text-primary' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                  >
                    Feed
                  </button>
                  <button
                    onClick={() => handleMobileNavClick('/questions')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/questions' ? 'bg-primary/20 text-primary' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                  >
                    Questions
                  </button>
                  <button
                    onClick={() => handleMobileNavClick('/challenges')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${location.pathname === '/challenges' ? 'bg-primary/20 text-primary' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                  >
                    <Code className="h-4 w-4" />
                    Challenges
                  </button>
                  <button
                    onClick={() => handleMobileNavClick('/projects')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${location.pathname.startsWith('/projects') ? 'bg-primary/20 text-primary' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                  >
                    <Briefcase className="h-4 w-4" />
                    Projects
                  </button>
                  <button
                    onClick={() => handleMobileNavClick('/leaderboard')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/leaderboard' ? 'bg-primary/20 text-primary' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                  >
                    Leaderboard
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="space-y-0.5 pt-3 border-t border-gray-800">
                  <button
                    onClick={() => {
                      setSearchOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </button>
                  <button
                    onClick={() => handleMobileNavClick('/messages')}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Messages
                  </button>
                </div>

                {/* Account Actions */}
                <div className="space-y-0.5 pt-3 border-t border-gray-800">
                  <button
                    onClick={() => handleMobileNavClick(`/profile/${user?.username}`)}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => handleMobileNavClick('/settings')}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleMobileNavClick('/admin')}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Admin Panel
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white w-[95vw] max-w-2xl mx-auto overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Search DevConnect</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search posts, questions, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchQuery);
                }
              }}
              className="bg-[#0a0a0a] border-gray-700 text-white text-sm"
              autoFocus
            />

            <div className="min-h-[100px] max-h-[50vh] sm:max-h-[400px] overflow-y-auto">
              <AnimatePresence mode="wait">
                {searchQuery.length >= 2 && (suggestions.posts.length > 0 || suggestions.users.length > 0 || suggestions.tags.length > 0) ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* Posts */}
                    {suggestions.posts.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Posts</h3>
                        <div className="space-y-1">
                          {suggestions.posts.map(post => (
                            <div
                              key={post.id}
                              className="p-2 rounded hover:bg-white/5 cursor-pointer flex items-center justify-between gap-2 group"
                              onClick={() => {
                                navigate(`/posts/${post.id}`);
                                setSearchOpen(false);
                              }}
                            >
                              <span className="text-xs sm:text-sm text-gray-200 group-hover:text-white truncate flex-1">{post.title}</span>
                              <Badge variant="secondary" className="text-xs bg-gray-800 text-gray-400 shrink-0">{post.category}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Users */}
                    {suggestions.users.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Users</h3>
                        <div className="space-y-1">
                          {suggestions.users.map(user => (
                            <div
                              key={user.username}
                              className="p-2 rounded hover:bg-white/5 cursor-pointer flex items-center gap-2 sm:gap-3 group"
                              onClick={() => {
                                navigate(`/profile/${user.username}`);
                                setSearchOpen(false);
                              }}
                            >
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs sm:text-sm text-gray-200 group-hover:text-white truncate">{user.name}</span>
                                <span className="text-xs text-gray-500 truncate">@{user.username}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {suggestions.tags.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {suggestions.tags.map(tag => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="cursor-pointer hover:bg-primary/20 hover:text-primary hover:border-primary transition-colors text-xs"
                              onClick={() => {
                                navigate(`/search?q=${encodeURIComponent(tag)}&type=tag`);
                                setSearchOpen(false);
                              }}
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : searchQuery.length >= 2 && !searchLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8 text-gray-400 text-sm"
                  >
                    No results found for "{searchQuery}"
                  </motion.div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">Type to search...</p>
                    <p className="text-xs mt-2 text-gray-500">Press Enter to see all results</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
};

export default Navbar;