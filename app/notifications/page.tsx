"use client";

import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import LoggedInHeader from '../../components/LoggedInHeader';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Bell, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  UserPlus, 
  AlertCircle,
  Sparkles,
  Check,
  Filter,
  Calendar
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_id?: string;
  related_type?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  user_type: string;
  full_name: string | null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // プロフィール取得
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profileData) {
        router.push('/login');
        return;
      }

      setProfile(profileData);

      // 通知取得
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(notificationsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'application_received':
      case 'new_application':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'application_accepted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'application_rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'message_received':
      case 'new_message':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'project_matched':
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationLink = (notification: Notification) => {
    if (notification.related_type === 'project' && notification.related_id) {
      return `/projects/${notification.related_id}`;
    }
    if (notification.related_type === 'application' && notification.related_id) {
      return `/projects/my?tab=applications`;
    }
    if (notification.related_type === 'message' && notification.related_id) {
      return `/messages`;
    }
    return null;
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.is_read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const notificationTypes = [
    { value: 'all', label: 'すべて' },
    { value: 'project_matched', label: 'マッチング' },
    { value: 'application_received', label: '応募受信' },
    { value: 'application_accepted', label: '応募承認' },
    { value: 'application_rejected', label: '応募却下' },
    { value: 'message_received', label: 'メッセージ' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LoggedInHeader userProfile={profile!} userEmail="" />

      <main className="container mx-auto p-4 md:p-8">
        {/* ヘッダー */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Bell className="w-6 h-6" />
                通知センター
              </h1>
              <p className="text-gray-600 mt-1">
                {unreadCount > 0 ? `${unreadCount}件の未読通知があります` : 'すべての通知を確認済みです'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                すべて既読にする
              </Button>
            )}
          </div>

          {/* フィルター */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                すべて ({notifications.length})
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                未読 ({unreadCount})
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {notificationTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 通知リスト */}
        <div className="bg-white rounded-lg shadow-sm">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {filter === 'unread' ? '未読の通知はありません' : '通知はありません'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => {
                const link = getNotificationLink(notification);
                const content = (
                  <div
                    className={`p-6 hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-base font-medium text-gray-800">
                              {notification.title}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDistanceToNow(new Date(notification.created_at), {
                                  addSuffix: true,
                                  locale: ja
                                })}
                              </p>
                              {!notification.is_read && (
                                <span className="text-xs font-medium text-blue-600">未読</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  markAsRead(notification.id);
                                }}
                                className="text-xs"
                              >
                                既読にする
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                if (window.confirm('この通知を削除しますか？')) {
                                  deleteNotification(notification.id);
                                }
                              }}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              削除
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );

                return link ? (
                  <Link 
                    key={notification.id} 
                    href={link}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}