"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { createClient } from "../../utils/supabase/client";
import LoggedInHeader from "../../components/LoggedInHeader";
import { ArrowLeft, MessageSquare, Clock, CheckCircle, User, Loader2, Send, X, MoreVertical, Edit2, Trash2, Check } from "lucide-react";
import { LoadingPage } from "../../components/ui/loading";

interface Conversation {
  id: string;
  project_id: string;
  client_id: string;
  pro_id: string;
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
  pro_profile?: {
    full_name: string | null;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count?: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_status: boolean;
  edited_at?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  sender_profile?: {
    full_name: string | null;
  };
}

export default function MessagesPage() {
  const router = useRouter();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [showMenuForMessage, setShowMenuForMessage] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // リアルタイム購読の設定
    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}`,
        },
        async (payload) => {
          // 新着メッセージを受信
          const newMessage = payload.new as any;
          
          // 現在選択中の会話のメッセージの場合、メッセージリストに追加
          if (selectedConversation?.id === newMessage.conversation_id) {
            // プロフィール情報を取得
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('id, full_name')
              .eq('id', newMessage.sender_id)
              .single();

            setMessages(prev => [...prev, {
              ...newMessage,
              sender_profile: senderProfile
            }]);

            // 既読にする
            await supabase
              .from('messages')
              .update({ read_status: true })
              .eq('id', newMessage.id);
          }
          
          // 会話一覧を更新
          await loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${currentUser.id}`,
        },
        async (payload) => {
          // 自分が送信したメッセージの場合も会話一覧を更新
          await loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, selectedConversation?.id]);

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
      } else if (profileData?.user_type === 'pro') {
        query = query.eq("pro_id", user.id);
      }

      const { data: conversationsData, error: convError } = await query;

      if (convError) {
        console.error("Error fetching conversations:", convError);
        return;
      }

      if (conversationsData && conversationsData.length > 0) {
        // プロフィール情報を取得
        const clientIds = Array.from(new Set(conversationsData.map(c => c.client_id)));
        const proIds = Array.from(new Set(conversationsData.map(c => c.pro_id)));
        
        const [clientProfiles, proProfiles] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", clientIds),
          supabase.from("profiles").select("id, full_name").in("id", proIds)
        ]);

        // 一度のクエリで全会話の最新メッセージを取得
        const conversationIds = conversationsData.map(c => c.id);
        
        // 各会話の最新メッセージを取得（Window関数を使用）
        const { data: lastMessages } = await supabase
          .from("messages")
          .select("conversation_id, content, created_at, sender_id")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false });
        
        // 会話ごとの最新メッセージをマップに変換
        const lastMessagesMap = lastMessages?.reduce((acc: Record<string, any>, msg) => {
          if (!acc[msg.conversation_id]) {
            acc[msg.conversation_id] = msg;
          }
          return acc;
        }, {}) || {};
        
        // 未読メッセージ数を一度のクエリで取得
        const { data: unreadMessages } = await supabase
          .from("messages")
          .select("conversation_id")
          .in("conversation_id", conversationIds)
          .eq("receiver_id", user.id)
          .eq("read_status", false);
        
        // 会話ごとの未読数を集計
        const unreadCountsMap = unreadMessages?.reduce((acc: Record<string, number>, msg) => {
          acc[msg.conversation_id] = (acc[msg.conversation_id] || 0) + 1;
          return acc;
        }, {}) || {};
        
        // 会話情報を統合
        const conversationsWithDetails = conversationsData.map(conv => ({
          ...conv,
          client_profile: clientProfiles.data?.find(p => p.id === conv.client_id),
          pro_profile: proProfiles.data?.find(p => p.id === conv.pro_id),
          last_message: lastMessagesMap[conv.id] || null,
          unread_count: unreadCountsMap[conv.id] || 0
        }));

        setConversations(conversationsWithDetails);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      // メッセージを取得
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
      } else if (messagesData) {
        // プロフィール情報を追加
        const senderIds = Array.from(new Set(messagesData.map(m => m.sender_id)));
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", senderIds);

        const messagesWithProfiles = messagesData.map(msg => ({
          ...msg,
          sender_profile: profiles?.find(p => p.id === msg.sender_id)
        }));

        setMessages(messagesWithProfiles);

        // 自分宛ての未読メッセージを既読にする
        const unreadMessageIds = messagesData
          .filter(m => m.receiver_id === currentUser?.id && !m.read_status)
          .map(m => m.id);

        if (unreadMessageIds.length > 0) {
          await supabase
            .from("messages")
            .update({ read_status: true })
            .in("id", unreadMessageIds);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation || !currentUser) return;
    
    setSending(true);
    
    try {
      const receiverId = selectedConversation.client_id === currentUser.id 
        ? selectedConversation.pro_id 
        : selectedConversation.client_id;

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: currentUser.id,
          receiver_id: receiverId,
          content: newMessage.trim(),
          message_type: "normal",
          project_id: selectedConversation.project_id
        })
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        alert("メッセージの送信に失敗しました");
      } else if (data) {
        // メッセージをローカルに追加（送信者自身の画面用）
        setMessages(prev => [...prev, {
          ...data,
          sender_profile: { full_name: userProfile?.full_name || null }
        }]);
        setNewMessage("");

        // 会話の最終メッセージ時刻を更新
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", selectedConversation.id);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("エラーが発生しました");
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editingContent.trim()) return;
    
    try {
      const { error } = await supabase
        .from("messages")
        .update({ content: editingContent.trim() })
        .eq("id", messageId);

      if (error) {
        console.error("Error editing message:", error);
        alert("メッセージの編集に失敗しました");
      } else {
        // ローカルのメッセージを更新
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: editingContent.trim(), edited_at: new Date().toISOString() }
            : msg
        ));
        setEditingMessageId(null);
        setEditingContent("");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("エラーが発生しました");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("このメッセージを削除しますか？")) return;
    
    try {
      const { error } = await supabase
        .from("messages")
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString(),
          deleted_by: currentUser?.id 
        })
        .eq("id", messageId);

      if (error) {
        console.error("Error deleting message:", error);
        alert("メッセージの削除に失敗しました");
      } else {
        // ローカルのメッセージを更新
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, is_deleted: true, deleted_at: new Date().toISOString() }
            : msg
        ));
        setShowMenuForMessage(null);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("エラーが発生しました");
    }
  };

  const startEditingMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
    setShowMenuForMessage(null);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleConversationSelect = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowMobileChat(true);
    await loadMessages(conversation.id);
  };

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDateForChat = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      {userProfile && (
        <LoggedInHeader userProfile={userProfile} userEmail={currentUser?.email} />
      )}

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* 左側: 会話リスト */}
          <div className={`${showMobileChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 bg-white border-r`}>
            <div className="h-16 px-4 border-b flex items-center">
              <h2 className="font-semibold">メッセージ一覧</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">メッセージはまだありません</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {userProfile?.user_type === 'client' 
                      ? 'プロフェッショナルからの応募を承認すると、メッセージのやり取りができるようになります'
                      : 'プロジェクトへの応募が承認されると、メッセージのやり取りができるようになります'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conversation) => {
                    const otherUser = userProfile?.user_type === 'client' 
                      ? conversation.pro_profile 
                      : conversation.client_profile;
                    const isSelected = selectedConversation?.id === conversation.id;

                    return (
                      <div
                        key={conversation.id}
                        onClick={() => handleConversationSelect(conversation)}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-500" />
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-gray-900 truncate">
                                {otherUser?.full_name || 'ユーザー'}
                              </p>
                              <div className="flex items-center space-x-2">
                                {(conversation.unread_count ?? 0) > 0 && (
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
                            
                            <p className="text-sm text-gray-600 mb-1 truncate">
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 右側: チャットエリア */}
          <div className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-gray-50`}>
            {selectedConversation ? (
              <>
                {/* チャットヘッダー */}
                <div className="h-16 px-4 bg-white border-b flex items-center">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="md:hidden"
                        onClick={() => setShowMobileChat(false)}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <div>
                        <h3 className="font-semibold">
                          {userProfile?.user_type === 'client' 
                            ? selectedConversation.pro_profile?.full_name 
                            : selectedConversation.client_profile?.full_name || 'ユーザー'}
                        </h3>
                        <p className="text-sm text-gray-500">{selectedConversation.project?.title}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* メッセージエリア */}
                <div className="flex-1 overflow-y-auto p-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">メッセージを送信して会話を始めましょう</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-4xl mx-auto">
                      {messages.map((message, index) => {
                        const isMyMessage = message.sender_id === currentUser?.id;
                        const showDate = index === 0 || 
                          formatDateForChat(message.created_at) !== formatDateForChat(messages[index - 1].created_at);

                        return (
                          <div key={message.id}>
                            {showDate && (
                              <div className="text-center my-4">
                                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                  {formatDateForChat(message.created_at)}
                                </span>
                              </div>
                            )}
                            
                            <div className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-xs md:max-w-md ${isMyMessage ? 'order-2' : 'order-1'}`}>
                                {!isMyMessage && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                      <User className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {message.sender_profile?.full_name || 'ユーザー'}
                                    </span>
                                  </div>
                                )}
                                
                                {message.is_deleted ? (
                                  <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-500 italic">
                                    <p className="text-sm">このメッセージは削除されました</p>
                                  </div>
                                ) : editingMessageId === message.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editingContent}
                                      onChange={(e) => setEditingContent(e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                      rows={3}
                                      autoFocus
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleEditMessage(message.id)}
                                        className="flex items-center gap-1"
                                      >
                                        <Check className="w-3 h-3" />
                                        保存
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={cancelEditing}
                                        className="flex items-center gap-1"
                                      >
                                        <X className="w-3 h-3" />
                                        キャンセル
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className={`px-4 py-2 rounded-lg ${
                                    isMyMessage 
                                      ? 'bg-primary text-white' 
                                      : 'bg-white border border-gray-200'
                                  }`}>
                                    <p className="text-sm whitespace-pre-wrap break-words">
                                      {message.content}
                                    </p>
                                    {message.edited_at && (
                                      <p className={`text-xs mt-1 ${
                                        isMyMessage ? 'text-white/70' : 'text-gray-400'
                                      }`}>
                                        (編集済み)
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                <div className={`flex items-center gap-1 mt-1 ${
                                  isMyMessage ? 'justify-end' : 'justify-start'
                                }`}>
                                  <p className="text-xs text-gray-500">
                                    {formatTime(message.created_at)}
                                  </p>
                                  
                                  {/* 自分のメッセージにのみメニューボタンを表示 */}
                                  {isMyMessage && !message.is_deleted && (
                                    <div className="relative ml-2">
                                      <button
                                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowMenuForMessage(
                                            showMenuForMessage === message.id ? null : message.id
                                          );
                                        }}
                                      >
                                        <MoreVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                      </button>
                                      
                                      {showMenuForMessage === message.id && (
                                        <div className="absolute right-0 bottom-full mb-1 w-32 bg-white rounded-md shadow-lg z-10 border">
                                          <button
                                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 text-left"
                                            onClick={() => startEditingMessage(message)}
                                          >
                                            <Edit2 className="w-3 h-3" />
                                            編集
                                          </button>
                                          <button
                                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 text-left text-red-600"
                                            onClick={() => handleDeleteMessage(message.id)}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            削除
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* メッセージ入力エリア */}
                <div className="bg-white border-t p-4">
                  <form onSubmit={sendMessage} className="flex gap-2 max-w-4xl mx-auto">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="メッセージを入力..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={sending}
                    />
                    <Button type="submit" disabled={sending || !newMessage.trim()}>
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p>左側から会話を選択してください</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}