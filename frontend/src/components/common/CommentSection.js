import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth } from '@/App';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, ThumbsUp, CornerDownRight, MoreHorizontal } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const CommentItem = ({ comment, allComments, onReply, onUpvote, depth = 0 }) => {
    const { user } = useAuth();
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [showReplies, setShowReplies] = useState(false);

    // Find direct children
    const replies = allComments.filter(c => c.parentId === comment.id);
    const hasReplies = replies.length > 0;

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        await onReply(replyContent, comment.id);
        setIsReplying(false);
        setReplyContent('');
        setShowReplies(true);
    };

    return (
        <div className={`flex gap-3 ${depth > 0 ? 'mt-3' : 'mt-4'}`}>
            <Avatar className="h-8 w-8 mt-1">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`} />
                <AvatarFallback>U</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <div className="bg-[#252525] rounded-lg p-3 border border-gray-800">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">User</span>
                        <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                </div>

                <div className="flex items-center gap-4 mt-1 ml-1">
                    <button
                        onClick={() => onUpvote(comment.id)}
                        className={`flex items-center gap-1 text-xs font-medium transition-colors ${user && comment.upvotes?.includes(user.id) ? 'text-primary' : 'text-gray-400 hover:text-white'}`}
                    >
                        <ThumbsUp className="h-3 w-3" />
                        {comment.upvotes?.length || 0}
                    </button>

                    <button
                        onClick={() => setIsReplying(!isReplying)}
                        className="text-xs font-medium text-gray-400 hover:text-white transition-colors"
                    >
                        Reply
                    </button>

                    {hasReplies && (
                        <button
                            onClick={() => setShowReplies(!showReplies)}
                            className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                        >
                            {showReplies ? 'Hide' : 'Show'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {isReplying && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3"
                        >
                            <form onSubmit={handleReplySubmit} className="flex gap-2">
                                <Textarea
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder="Write a reply..."
                                    className="min-h-[60px] bg-[#1a1a1a] border-gray-700 text-sm"
                                />
                                <Button type="submit" size="sm" className="h-auto self-end">Reply</Button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showReplies && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="pl-4 border-l-2 border-gray-800"
                        >
                            {replies.map(reply => (
                                <CommentItem
                                    key={reply.id}
                                    comment={reply}
                                    allComments={allComments}
                                    onReply={onReply}
                                    onUpvote={onUpvote}
                                    depth={depth + 1}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const CommentSection = ({ answerId }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [showComments, setShowComments] = useState(false);

    useEffect(() => {
        if (showComments) {
            fetchComments();
        }
    }, [showComments, answerId]);

    const fetchComments = async () => {
        try {
            const response = await axios.get(`${API}/answers/${answerId}/comments`);
            setComments(response.data);
        } catch (error) {
            console.error('Failed to load comments');
        } finally {
            setLoading(false);
        }
    };

    const handlePostComment = async (content, parentId = null) => {
        if (!user) {
            toast.error('Please login to comment');
            return;
        }

        try {
            await axios.post(`${API}/comments`, {
                content,
                answerId,
                parentId
            });
            fetchComments();
            if (!parentId) setNewComment('');
            toast.success('Comment posted');
        } catch (error) {
            toast.error('Failed to post comment');
        }
    };

    const handleUpvote = async (commentId) => {
        if (!user) {
            toast.error('Please login to upvote');
            return;
        }
        try {
            await axios.post(`${API}/comments/${commentId}/upvote`);
            fetchComments(); // Or optimistic update
        } catch (error) {
            toast.error('Failed to upvote');
        }
    };

    const topLevelComments = comments.filter(c => !c.parentId);

    return (
        <div className="mt-4 pt-4 border-t border-gray-800/50">
            {!showComments ? (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowComments(true)}
                    className="text-gray-400 hover:text-white"
                >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Show Comments
                </Button>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-300">Comments ({comments.length})</h4>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowComments(false)}
                            className="text-xs text-gray-500 hover:text-white h-auto py-1"
                        >
                            Hide
                        </Button>
                    </div>

                    {/* New Comment Input */}
                    <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} />
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex gap-2">
                            <Textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="min-h-[40px] h-[40px] py-2 bg-[#1a1a1a] border-gray-700 text-sm resize-none focus:h-[80px] transition-all"
                            />
                            <Button
                                size="sm"
                                onClick={() => handlePostComment(newComment)}
                                disabled={!newComment.trim()}
                                className="h-auto"
                            >
                                Post
                            </Button>
                        </div>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-1">
                        {topLevelComments.map(comment => (
                            <CommentItem
                                key={comment.id}
                                comment={comment}
                                allComments={comments}
                                onReply={handlePostComment}
                                onUpvote={handleUpvote}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommentSection;
