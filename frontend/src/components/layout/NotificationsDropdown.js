import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '@/App';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Bell, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

const NotificationsDropdown = () => {
    const { user, token, socket } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user, open]); // Refetch when opening to ensure fresh data

    useEffect(() => {
        if (socket) {
            socket.on('new_notification', (notification) => {
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
                toast.info(notification.message);
            });
        }
        return () => {
            if (socket) {
                socket.off('new_notification');
            }
        };
    }, [socket]);

    const fetchNotifications = async () => {
        try {
            const response = await axios.get(`${API}/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(response.data);
            setUnreadCount(response.data.filter(n => !n.read).length);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            await axios.put(`${API}/notifications/${notificationId}/read`, null, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await axios.put(`${API}/notifications/read-all`, null, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
            toast.success('All notifications marked as read');
        } catch (error) {
            toast.error('Failed to mark all as read');
        }
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.read) {
            await handleMarkAsRead(notification.id);
        }
        setOpen(false);
        if (notification.link) {
            navigate(notification.link);
        }
    };

    if (!user) return null;

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-white">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#0a0a0a]" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-[#1a1a1a] border-gray-800 text-white">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="xs" onClick={handleMarkAllRead} className="h-6 text-xs text-primary hover:text-primary/80">
                            Mark all read
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-800" />
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-sm">
                            No notifications
                        </div>
                    ) : (
                        <div className="py-1">
                            {notifications.map((notification) => (
                                <DropdownMenuItem
                                    key={notification.id}
                                    className={`px-4 py-3 cursor-pointer focus:bg-[#252525] ${!notification.read ? 'bg-[#252525]/50' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex flex-col gap-1 w-full">
                                        <div className="flex justify-between items-start">
                                            <span className={`text-sm ${!notification.read ? 'font-semibold text-white' : 'text-gray-300'}`}>
                                                {notification.message}
                                            </span>
                                            {!notification.read && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {formatDate(notification.createdAt)}
                                        </span>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default NotificationsDropdown;
