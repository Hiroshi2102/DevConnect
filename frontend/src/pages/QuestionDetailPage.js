import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/App';
import { useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ThumbsUp, CheckCircle, XCircle, Eye, MessageCircle, ChevronUp, Share2, Flag, MoreHorizontal } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from '@/components/common/CodeBlock';
import ReportDialog from '@/components/common/ReportDialog';
import { motion, AnimatePresence } from 'framer-motion';
import CommentSection from '@/components/common/CommentSection';

const QuestionDetailPage = () => {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answerContent, setAnswerContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestion();
    fetchAnswers();
  }, [id]);

  const fetchQuestion = async () => {
    try {
      const response = await axios.get(`${API}/questions/${id}`);
      setQuestion(response.data);
    } catch (error) {
      toast.error('Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnswers = async () => {
    try {
      const response = await axios.get(`${API}/questions/${id}/answers`);
      setAnswers(response.data);
    } catch (error) {
      console.error('Failed to load answers');
    }
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!answerContent.trim()) return;
    if (!user) {
      toast.error('Please login to answer');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/answers`, {
        questionId: id,
        content: answerContent
      });
      toast.success('✅ Answer posted! (+5 points)');
      setAnswerContent('');
      fetchAnswers();
      // Also refresh question to update answer count if we were tracking it there
      fetchQuestion();
    } catch (error) {
      toast.error('Failed to post answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptAnswer = async (answerId, helpful) => {
    try {
      await axios.put(`${API}/answers/${answerId}/accept`, null, {
        params: { helpful }
      });
      const points = helpful ? 100 : 20;
      toast.success(`🎉 Answer marked! (+${points} points to helper)`);
      fetchAnswers();
      fetchQuestion();
    } catch (error) {
      toast.error('Failed to accept answer');
    }
  };

  const handleAnswerUpvote = async (answerId) => {
    if (!user) {
      toast.error('Please login to upvote');
      return;
    }
    try {
      await axios.post(`${API}/answers/${answerId}/upvote`);
      // Optimistic update or refetch
      fetchAnswers();
    } catch (error) {
      toast.error('Failed to upvote');
    }
  };

  const handleQuestionUpvote = async () => {
    if (!user) {
      toast.error('Please login to upvote');
      return;
    }

    try {
      const response = await axios.post(`${API}/questions/${id}/upvote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestion({ ...question, upvotes: response.data.upvotes });
    } catch (error) {
      toast.error('Failed to upvote');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
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

  if (!question) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="text-center py-20">
          <p className="text-gray-400">Question not found</p>
          <Button onClick={() => navigate('/questions')} className="mt-4">Back to Questions</Button>
        </div>
      </div>
    );
  }

  const isQuestionOwner = question.userId === user?.id;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      <Navbar />

      <div className="max-w-5xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="ghost"
            className="text-gray-400 mb-4 sm:mb-6 hover:text-white hover:bg-white/5 text-sm sm:text-base h-9 sm:h-10"
            onClick={() => navigate('/questions')}
            data-testid="back-to-questions-btn"
          >
            <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
            Back to Questions
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 md:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-9 space-y-4 sm:space-y-6">

            {/* Question Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="bg-[#1a1a1a] border-gray-800 overflow-hidden relative group">
                {/* Decorative gradient */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-70" />

                <CardHeader className="pb-2">
                  <div className="flex items-start gap-4">
                    {/* Upvote Button */}
                    <div className="flex flex-col items-center gap-1 bg-[#252525] rounded-lg p-2 border border-gray-800">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 hover:bg-white/10 transition-all ${user && question.upvotes?.includes(user?.id) ? 'text-orange-500 scale-110' : 'text-gray-400'
                          }`}
                        onClick={handleQuestionUpvote}
                      >
                        <ChevronUp className="h-8 w-8" strokeWidth={3} />
                      </Button>
                      <span className={`text-lg font-bold ${user && question.upvotes?.includes(user?.id) ? 'text-orange-500' : 'text-gray-300'}`}>
                        {question.upvotes?.length || 0}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className={question.status === 'answered' || question.status === 'solved' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}>
                            {question.status === 'solved' ? 'SOLVED' : question.status.toUpperCase()}
                          </Badge>
                          <span className="text-gray-500 text-sm">•</span>
                          <span className="text-gray-400 text-sm">{formatDate(question.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-8 text-gray-400 hover:text-white" onClick={copyLink}>
                            <Share2 className="h-4 w-4 mr-1" />
                            Share
                          </Button>
                          <ReportDialog targetId={question.id} targetType="question" />
                        </div>
                      </div>

                      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4 leading-tight" data-testid="question-detail-title">
                        {question.title}
                      </h1>

                      <div className="flex flex-wrap gap-2 mb-2">
                        {question.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-[#2a2a2a] hover:bg-[#333] text-blue-400 border-none cursor-pointer transition-colors">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="prose prose-invert max-w-none pl-0 sm:pl-16">
                    <div className="markdown-content text-gray-300 leading-relaxed">
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
                              <code className="bg-[#282c34] text-[#abb2bf] px-1.5 py-0.5 rounded text-sm font-mono">
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {question.description}
                      </ReactMarkdown>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800 pl-0 sm:pl-16">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-gray-800">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${question.userId}`} />
                        <AvatarFallback>OP</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-white">Asked by User</p>
                        <p className="text-xs text-gray-500">New Contributor</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1" title="Views">
                        <Eye className="h-4 w-4" />
                        {question.views}
                      </div>
                      <div className="flex items-center gap-1" title="Comments">
                        <MessageCircle className="h-4 w-4" />
                        0
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Answers Section Header */}
            <div className="flex items-center justify-between mt-8 mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
              </h2>
              {/* Could add sort dropdown here */}
            </div>

            {/* Answers List */}
            <div className="space-y-6">
              <AnimatePresence>
                {answers.map((answer, index) => (
                  <motion.div
                    key={answer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card
                      className={`bg-[#1a1a1a] border-gray-800 transition-all duration-300 ${answer.isAccepted ? 'border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : ''}`}
                      data-testid={`answer-${answer.id}`}
                    >
                      <CardContent className="p-3 sm:p-4 md:p-6">
                        <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                          <div className="flex flex-col items-center gap-1 pt-1">
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border border-gray-700 shrink-0">
                              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${answer.userId}`} />
                              <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                            {answer.isAccepted && (
                              <div className="mt-2 text-green-500" title="Accepted Answer">
                                <CheckCircle className="h-6 w-6 fill-green-500/20" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-sm font-medium text-white hover:text-primary cursor-pointer transition-colors">User</p>
                                <p className="text-xs text-gray-400">{formatDate(answer.createdAt)}</p>
                              </div>
                              {answer.isAccepted && (
                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                  Accepted Solution
                                </Badge>
                              )}
                            </div>

                            <div className="prose prose-invert max-w-none mb-6">
                              <div className="markdown-content text-gray-300">
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
                                        <code className="bg-[#282c34] text-[#abb2bf] px-1.5 py-0.5 rounded text-sm font-mono">
                                          {children}
                                        </code>
                                      );
                                    },
                                  }}
                                >
                                  {answer.content}
                                </ReactMarkdown>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-800/50 flex-wrap gap-2">
                              <div className="flex items-center gap-2 sm:gap-4">
                                <button
                                  onClick={() => handleAnswerUpvote(answer.id)}
                                  className={`flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm transition-colors px-2 py-1 rounded-md ${user && answer.upvotes?.includes(user?.id) ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                  data-testid={`upvote-answer-${answer.id}`}
                                >
                                  <ThumbsUp className={`h-3 w-3 sm:h-4 sm:w4 ${user && answer.upvotes?.includes(user?.id) ? 'fill-primary/20' : ''}`} />
                                  <span className="font-medium">{answer.upvotes?.length || 0}</span>
                                  <span className="hidden sm:inline">Upvotes</span>
                                </button>

                                <button className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-400 hover:text-white hover:bg-white/5 px-2 py-1 rounded-md transition-colors">
                                  <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="hidden sm:inline">Reply</span>
                                </button>
                              </div>

                              {isQuestionOwner && !answer.isAccepted && !question.status.includes('solved') && (
                                <div className="flex gap-2 w-full sm:w-auto">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 sm:h-8 border-green-500/30 text-green-500 hover:bg-green-500/10 hover:text-green-400 text-xs sm:text-sm flex-1 sm:flex-none"
                                    onClick={() => handleAcceptAnswer(answer.id, true)}
                                    data-testid={`accept-helpful-${answer.id}`}
                                  >
                                    <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                                    Accept Solution
                                  </Button>
                                </div>
                              )}
                            </div>

                            <CommentSection answerId={answer.id} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {answers.length === 0 && (
                <div className="text-center py-12 bg-[#1a1a1a] rounded-xl border border-dashed border-gray-800">
                  <div className="bg-gray-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1">No answers yet</h3>
                  <p className="text-gray-400 max-w-sm mx-auto">
                    Be the first to help! Share your knowledge and earn points.
                  </p>
                </div>
              )}
            </div>

            {/* Answer Form */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="bg-[#1a1a1a] border-gray-800 mt-8 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-900 to-[#1a1a1a] border-b border-gray-800">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <span className="bg-primary/20 text-primary p-1 rounded">
                      <MoreHorizontal className="h-5 w-5" />
                    </span>
                    Your Answer
                  </h3>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmitAnswer}>
                    <div className="mb-4">
                      <Textarea
                        placeholder="Write your answer here... Markdown is supported for code blocks and formatting."
                        value={answerContent}
                        onChange={(e) => setAnswerContent(e.target.value)}
                        rows={8}
                        className="bg-[#0a0a0a] border-gray-700 text-white focus:border-primary transition-colors resize-y min-h-[150px]"
                        data-testid="answer-textarea"
                      />
                      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                        <span>Markdown supported</span>
                        <span>{answerContent.length} characters</span>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        className="bg-gradient-to-r from-[#0ea5e9] to-[#14b8a6] text-white hover:opacity-90 transition-opacity px-8"
                        disabled={!answerContent.trim() || submitting}
                        data-testid="submit-answer-btn"
                      >
                        {submitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Posting...
                          </>
                        ) : (
                          <>
                            Post Answer <span className="ml-1 opacity-70 text-xs">(+5 pts)</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block lg:col-span-3 space-y-4 sm:space-y-6">
            {/* Stats Card */}
            <Card className="bg-[#1a1a1a] border-gray-800">
              <CardHeader>
                <h3 className="font-semibold text-white">Stats</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Asked</span>
                  <span className="text-white">{formatDate(question.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Views</span>
                  <span className="text-white">{question.views}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Status</span>
                  <span className={question.status === 'solved' ? 'text-green-500' : 'text-yellow-500'}>
                    {question.status.toUpperCase()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Related Tags */}
            <Card className="bg-[#1a1a1a] border-gray-800">
              <CardHeader>
                <h3 className="font-semibold text-white">Related Tags</h3>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {question.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 cursor-pointer transition-all">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionDetailPage;