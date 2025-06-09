"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { createClient } from "../../utils/supabase/client";
import { ArrowLeft, MessageSquare, Clock, CheckCircle, User, Loader2 } from "lucide-react";

interface Conversation {
  id: string;
  project_id: string;
  client_id: string;
  pm_id: string;
  initiated_by: 'application' | 'scout';
  status: 'pending' | 'active' | 'closed';
  last_message_at: string | null;
  created_at: string;
  project?: {
    id: string;
    title: string;
    status: string;
  };
  client_profile?: {
    full_name: string | null;
  };
  pm_profile?: {
    full_name: string | null;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count?: number;
}

export default function MessagesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }
      
      setCurrentUser(user);

      // ユーザープロフィールを取得
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setUserProfile(profileData);

      // 会話一覧を取得
      let query = supabase
        .from("conversations")
        .select(`
          *,
          project:projects!inner(id, title, status)
        `)
        .eq("status", "active")
        .order("last_message_at", { ascending: false, nullsFirst: false });

      // ユーザータイプに応じてフィルタリング
      if (profileData?.user_type === 'client') {
        query = query.eq("client_id", user.id);
      } else if (profileData?.user_type === 'pm') {
        query = query.eq("pm_id", user.id);
      }

      const { data: conversationsData, error: convError } = await query;

      if (convError) {
        console.error("Error fetching conversations:", convError);
        return;
      }

      if (conversationsData && conversationsData.length > 0) {
        // プロフィール情報を取得
        const clientIds = Array.from(new Set(conversationsData.map(c => c.client_id)));
        const pmIds = Array.from(new Set(conversationsData.map(c => c.pm_id)));
        
        const [clientProfiles, pmProfiles] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", clientIds),
          supabase.from("profiles").select("id, full_name").in("id", pmIds)
        ]);

        // 最新メッセージと未読数を取得
        const conversationsWithDetails = await Promise.all(
          conversationsData.map(async (conv) => {
            // 最新メッセージを取得
            const { data: lastMessage } = await supabase
              .from("messages")
              .select("content, created_at, sender_id")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            // 未読メッセージ数を取得
            const { count: unreadCount } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conv.id)
              .eq("receiver_id", user.id)
              .eq("read_status", false);

            return {
              ...conv,
              client_profile: clientProfiles.data?.find(p => p.id === conv.client_id),
              pm_profile: pmProfiles.data?.find(p => p.id === conv.pm_id),
              last_message: lastMessage,
              unread_count: unreadCount || 0
            };
          })
        );

        setConversations(conversationsWithDetails);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '昨日';
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return date.toLocaleDateString('ja-JP');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                戻る
              </Button>
            </Link>
            <h1 className="text-xl font-bold">メッセージ</h1>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto p-4 md:p-8 max-w-4xl">
        {conversations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">メッセージはまだありません</p>
            <p className="text-sm text-gray-400 mt-2">
              {userProfile?.user_type === 'client' 
                ? 'PMからの応募を承認すると、メッセージのやり取りができるようになります'
                : 'プロジェクトへの応募が承認されると、メッセージのやり取りができるようになります'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm divide-y">
            {conversations.map((conversation) => {
              const otherUser = userProfile?.user_type === 'client' 
                ? conversation.pm_profile 
                : conversation.client_profile;

              return (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className="block hover:bg-gray-50 transition-colors"
                >
                  <div className="p-4 md:p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-500" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-gray-900 truncate">
                              {otherUser?.full_name || 'ユーザー'}
                            </p>
                            <div className="flex items-center space-x-2">
                              {conversation.unread_count && conversation.unread_count > 0 && (
                                <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                                  {conversation.unread_count}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {conversation.last_message 
                                  ? formatDate(conversation.last_message.created_at)
                                  : formatDate(conversation.created_at)}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-1">
                            {conversation.project?.title}
                          </p>
                          
                          {conversation.last_message && (
                            <p className="text-sm text-gray-500 truncate">
                              {conversation.last_message.sender_id === currentUser?.id && '自分: '}
                              {conversation.last_message.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}