import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Send, Plus, Search, MessageSquare, Folder, Paperclip, Download, File, Image as ImageIcon, X, Users, Info, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

const MessagesPage = () => {
  const { user, token, socket } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      socket.on('new_message', (message) => {
        if (activeConversation && message.conversationId === activeConversation.id) {
          setMessages(prev => [...prev, message]);
          scrollToBottom();
        }
        fetchConversations();
      });
    }
    return () => {
      if (socket) {
        socket.off('new_message');
      }
    };
  }, [socket, activeConversation, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API}/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await axios.get(`${API}/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    fetchMessages(conv.id);
    setShowGroupInfo(false);
  };

  const handleBackToConversations = () => {
    setActiveConversation(null);
    setMessages([]);
    setShowGroupInfo(false);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);

          const response = await axios.post(`${API}/messages/upload`, formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
          return response.data;
        })
      );

      setAttachments(prev => [...prev, ...uploadedFiles]);
      toast.success(`${files.length} file(s) uploaded`);
    } catch (error) {
      toast.error('Failed to upload file');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!activeConversation) return;

    try {
      const response = await axios.post(`${API}/messages`, {
        conversationId: activeConversation.id,
        content: newMessage,
        attachments
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages([...messages, response.data]);
      setNewMessage('');
      setAttachments([]);
      fetchConversations();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`${API}/search`, {
        params: { q: query, type: 'users', limit: 10 }
      });
      setSearchResults(response.data.users || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const startNewChat = async (selectedUser) => {
    setNewChatOpen(false);
    setSearchQuery('');
    setSearchResults([]);

    try {
      const response = await axios.post(`${API}/conversations`, {
        participants: [user.id, selectedUser.id],
        isGroup: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await fetchConversations();
      handleSelectConversation(response.data);
    } catch (error) {
      toast.error('Failed to create conversation');
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    if (selectedUsers.length < 2) {
      toast.error('Please select at least 2 members');
      return;
    }

    try {
      const response = await axios.post(`${API}/conversations`, {
        name: groupName,
        participants: [...selectedUsers.map(u => u.id), user.id],
        isGroup: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Group created!');
      setNewGroupOpen(false);
      setGroupName('');
      setSelectedUsers([]);
      await fetchConversations();
      handleSelectConversation(response.data);
    } catch (error) {
      toast.error('Failed to create group');
    }
  };

  const toggleUserSelection = (selectedUser) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.id === selectedUser.id);
      if (exists) {
        return prev.filter(u => u.id !== selectedUser.id);
      }
      return [...prev, selectedUser];
    });
  };

  const leaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;

    try {
      await axios.delete(`${API}/conversations/${activeConversation.id}/members/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Left group');
      setActiveConversation(null);
      setMessages([]);
      fetchConversations();
    } catch (error) {
      toast.error('Failed to leave group');
    }
  };

  const getConversationName = (conv) => {
    if (conv.isGroup) {
      return conv.name || 'Group Chat';
    }
    const otherUser = conv.participantDetails?.find(p => p.id !== user.id);
    return otherUser?.name || 'Unknown';
  };

  const getConversationAvatar = (conv) => {
    if (conv.isGroup) {
      return conv.avatar;
    }
    const otherUser = conv.participantDetails?.find(p => p.id !== user.id);
    return otherUser?.avatar;
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-6 h-full">

          {/* Sidebar - Hidden on mobile when chat is active */}
          <div className={`${activeConversation ? 'hidden md:block' : 'block'} md:col-span-4 lg:col-span-3 flex flex-col h-full bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden`}>
            <div className="p-3 sm:p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-white text-base sm:text-lg">Messages</h2>
              <div className="flex gap-1 sm:gap-2">
                <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="New Group">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white w-[95vw] max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-base sm:text-lg">Create New Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Input
                          placeholder="Group name"
                          className="bg-[#0a0a0a] border-gray-700 text-sm"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                        />
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                        <Input
                          placeholder="Search users..."
                          className="pl-9 bg-[#0a0a0a] border-gray-700 text-sm"
                          value={searchQuery}
                          onChange={(e) => handleSearchUsers(e.target.value)}
                        />
                      </div>
                      {selectedUsers.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedUsers.map(u => (
                            <div key={u.id} className="bg-primary/20 text-primary px-2 py-1 rounded text-xs sm:text-sm flex items-center gap-1">
                              {u.name}
                              <X className="h-3 w-3 cursor-pointer" onClick={() => toggleUserSelection(u)} />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {searchResults.filter(u => u.id !== user.id).map(searchUser => (
                          <div
                            key={searchUser.id}
                            className={`flex items-center gap-2 sm:gap-3 p-2 hover:bg-[#252525] rounded cursor-pointer ${selectedUsers.find(u => u.id === searchUser.id) ? 'bg-[#252525]' : ''
                              }`}
                            onClick={() => toggleUserSelection(searchUser)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={searchUser.avatar} />
                              <AvatarFallback>{searchUser.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">{searchUser.name}</div>
                              <div className="text-xs text-gray-400 truncate">@{searchUser.username}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={createGroup}
                        className="w-full bg-primary text-black hover:bg-primary/90 text-sm"
                        disabled={!groupName.trim() || selectedUsers.length < 2}
                      >
                        Create Group
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="New Chat">
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white w-[95vw] max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-base sm:text-lg">New Message</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                        <Input
                          placeholder="Search users..."
                          className="pl-9 bg-[#0a0a0a] border-gray-700 text-sm"
                          value={searchQuery}
                          onChange={(e) => handleSearchUsers(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {searchResults.map(searchUser => (
                          <div
                            key={searchUser.id}
                            className="flex items-center gap-2 sm:gap-3 p-2 hover:bg-[#252525] rounded cursor-pointer"
                            onClick={() => startNewChat(searchUser)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={searchUser.avatar} />
                              <AvatarFallback>{searchUser.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">{searchUser.name}</div>
                              <div className="text-xs text-gray-400 truncate">@{searchUser.username}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      className={`p-3 sm:p-4 flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-[#252525] transition-colors ${activeConversation?.id === conv.id ? 'bg-[#252525] border-l-2 border-primary' : ''
                        }`}
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                        <AvatarImage src={getConversationAvatar(conv)} />
                        <AvatarFallback>{getConversationName(conv)[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="font-medium text-white truncate flex items-center gap-2 text-sm sm:text-base">
                            {getConversationName(conv)}
                            {conv.isGroup && <Users className="h-3 w-3 text-gray-500 shrink-0" />}
                          </span>
                          {conv.lastMessage && (
                            <span className="text-xs text-gray-500 shrink-0">
                              {formatDate(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p className={`text-xs sm:text-sm truncate ${!conv.lastMessage.read && conv.lastMessage.receiverId === user.id
                            ? 'text-white font-medium'
                            : 'text-gray-400'
                            }`}>
                            {conv.lastMessage.senderId === user.id ? 'You: ' : ''}
                            {conv.lastMessage.content || (conv.lastMessage.attachments?.length > 0 ? '📎 Attachment' : '')}
                          </p>
                        )}
                        {conv.lastMessage?.projectTitle && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Folder className="h-3 w-3" />
                            <span className="truncate">{conv.lastMessage.projectTitle}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area - Full width on mobile when active */}
          <div className={`${activeConversation ? 'block' : 'hidden md:block'} md:col-span-8 lg:col-span-9 flex flex-col h-full bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden`}>
            {activeConversation ? (
              <>
                {/* Header */}
                <div className="p-3 sm:p-4 border-b border-gray-800 flex items-center justify-between bg-[#1a1a1a] shrink-0 gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    {/* Back button - Mobile only */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden h-8 w-8 shrink-0"
                      onClick={handleBackToConversations}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                      <AvatarImage src={getConversationAvatar(activeConversation)} />
                      <AvatarFallback>{getConversationName(activeConversation)[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white text-sm sm:text-base truncate">{getConversationName(activeConversation)}</h3>
                      {activeConversation.isGroup && (
                        <p className="text-xs text-gray-400 truncate">
                          {activeConversation.participants?.length} members
                        </p>
                      )}
                    </div>
                  </div>
                  {activeConversation.isGroup && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowGroupInfo(!showGroupInfo)}
                      className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                    >
                      <Info className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  )}
                </div>

                <div className="flex flex-1 overflow-hidden">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-3 sm:p-4">
                    <div className="space-y-3 sm:space-y-4">
                      {messages.map((msg, idx) => {
                        const isMe = msg.senderId === user.id;
                        const sender = msg.senderDetails || activeConversation.participantDetails?.find(p => p.id === msg.senderId);

                        return (
                          <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%]`}>
                              {activeConversation.isGroup && !isMe && sender && (
                                <div className="text-xs text-gray-400 mb-1 ml-1">{sender.name}</div>
                              )}
                              <div className={`rounded-lg p-2.5 sm:p-3 break-words overflow-wrap-anywhere ${isMe ? 'bg-primary text-white' : 'bg-[#252525] text-gray-200'
                                }`}>
                                {msg.projectTitle && (
                                  <div
                                    className={`flex items-center gap-1 text-xs mb-2 pb-2 border-b cursor-pointer hover:underline ${isMe ? 'border-blue-400/30 text-blue-100' : 'border-gray-600/50 text-gray-400'
                                      }`}
                                    onClick={() => navigate(`/projects/${msg.projectId}`)}
                                  >
                                    <Folder className="h-3 w-3 shrink-0" />
                                    <span className="font-semibold truncate">{msg.projectTitle}</span>
                                  </div>
                                )}
                                {msg.content && <p className="text-sm break-words overflow-wrap-anywhere">{msg.content}</p>}
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="mt-2 space-y-2">
                                    {msg.attachments.map((attachment, i) => (
                                      <a
                                        key={i}
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 p-2 rounded text-sm ${isMe ? 'bg-blue-400/20 hover:bg-blue-400/30' : 'bg-gray-700/50 hover:bg-gray-700'
                                          }`}
                                      >
                                        <span className="shrink-0">{getFileIcon(attachment.type)}</span>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs sm:text-sm truncate">{attachment.filename}</div>
                                          <div className="text-xs opacity-70">
                                            {(attachment.size / 1024).toFixed(1)} KB
                                          </div>
                                        </div>
                                        <Download className="h-4 w-4 shrink-0" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                                <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                  {formatDate(msg.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={scrollRef} />
                    </div>
                  </ScrollArea>

                  {/* Group Info Sidebar - Desktop only, Modal on mobile */}
                  {showGroupInfo && activeConversation.isGroup && (
                    <>
                      {/* Desktop Sidebar */}
                      <div className="hidden md:block w-64 lg:w-80 border-l border-gray-800 p-4 overflow-y-auto">
                        <h3 className="font-bold text-white mb-4">Group Info</h3>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm text-gray-400 mb-2">Members ({activeConversation.participants?.length})</h4>
                            <div className="space-y-2">
                              {activeConversation.participantDetails?.map(participant => (
                                <div key={participant.id} className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={participant.avatar} />
                                    <AvatarFallback>{participant.name[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm text-white truncate">{participant.name}</div>
                                    <div className="text-xs text-gray-500 truncate">@{participant.username}</div>
                                  </div>
                                  {activeConversation.admins?.includes(participant.id) && (
                                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded shrink-0">Admin</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={leaveGroup}
                          >
                            Leave Group
                          </Button>
                        </div>
                      </div>

                      {/* Mobile Modal */}
                      <Dialog open={showGroupInfo} onOpenChange={setShowGroupInfo}>
                        <DialogContent className="md:hidden bg-[#1a1a1a] border-gray-800 text-white w-[95vw] max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-base">Group Info</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div>
                              <h4 className="text-sm text-gray-400 mb-2">Members ({activeConversation.participants?.length})</h4>
                              <div className="space-y-2 max-h-80 overflow-y-auto">
                                {activeConversation.participantDetails?.map(participant => (
                                  <div key={participant.id} className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={participant.avatar} />
                                      <AvatarFallback>{participant.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm text-white truncate">{participant.name}</div>
                                      <div className="text-xs text-gray-500 truncate">@{participant.username}</div>
                                    </div>
                                    {activeConversation.admins?.includes(participant.id) && (
                                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded shrink-0">Admin</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                leaveGroup();
                                setShowGroupInfo(false);
                              }}
                            >
                              Leave Group
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>

                {/* Input */}
                <div className="p-2 sm:p-3 md:p-4 border-t border-gray-800 bg-[#1a1a1a] shrink-0">
                  {attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {attachments.map((file, i) => (
                        <div key={i} className="bg-[#252525] rounded p-2 flex items-center gap-2 text-xs sm:text-sm">
                          {getFileIcon(file.type)}
                          <span className="max-w-[100px] sm:max-w-[150px] truncate">{file.filename}</span>
                          <X
                            className="h-4 w-4 cursor-pointer text-gray-400 hover:text-white shrink-0"
                            onClick={() => removeAttachment(i)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex gap-1.5 sm:gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      multiple
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
                    >
                      <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="bg-[#0a0a0a] border-gray-700 text-white text-sm flex-1 min-w-0"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={(!newMessage.trim() && attachments.length === 0) || uploading}
                      className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
                    >
                      <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
                <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 mb-4 opacity-20" />
                <p className="text-sm sm:text-base md:text-lg text-center">Select a conversation to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


export default MessagesPage;
