import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, TrendingUp } from 'lucide-react';
import { getRankColor } from '@/lib/utils';
import { toast } from 'sonner';

const LeaderboardPage = () => {
  const [users, setUsers] = useState([]);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API}/leaderboard?period=${period}&limit=100`);
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
        </div>

        <Tabs value={period} onValueChange={setPeriod} className="mb-6">
          <TabsList className="bg-[#1a1a1a]" data-testid="leaderboard-tabs">
            <TabsTrigger value="all" data-testid="tab-all">All Time</TabsTrigger>
            <TabsTrigger value="month" data-testid="tab-month">This Month</TabsTrigger>
            <TabsTrigger value="week" data-testid="tab-week">This Week</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="spinner w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user, index) => (
              <Card
                key={user.id}
                className={`bg-[#1a1a1a] border-gray-800 transition-all ${
                  index < 3 ? 'border-primary/30' : ''
                }`}
                data-testid={`leaderboard-user-${index}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Rank */}
                      <div className="flex items-center justify-center w-12 h-12">
                        {index < 3 ? (
                          <div className={`text-2xl ${
                            index === 0 ? 'text-yellow-400' :
                            index === 1 ? 'text-gray-400' :
                            'text-orange-400'
                          }`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </div>
                        ) : (
                          <span className="text-2xl font-bold text-gray-500">#{index + 1}</span>
                        )}
                      </div>

                      {/* User Info */}
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">{user.name}</h3>
                        <p className="text-sm text-gray-400">@{user.username}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{user.points}</div>
                        <div className="text-xs text-gray-400">Points</div>
                      </div>
                      <Badge className={`${getRankColor(user.rank)} px-4 py-1`}>
                        {user.rank}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {users.length === 0 && (
              <Card className="bg-[#1a1a1a] border-gray-800 text-center p-12">
                <p className="text-gray-400">No users yet</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;