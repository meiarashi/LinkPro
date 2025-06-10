"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { createClient } from "../../../utils/supabase/client";
import { ArrowLeft, Send, Loader2, User, MoreVertical, Edit2, Trash2, X, Check } from "lucide-react";

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

interface Conversation {
  id: string;
  project_id: string;
  client_id: string;
  pm_id: string;
  status: string;
  application_id?: string;
  project?: {
    title: string;
  };
  client_profile?: {
    full_name: string | null;
  };
  pm_profile?: {
    full_name: string | null;
  };
}

export default function ConversationPage({ 
  params 
}: { 
  params: { conversationId: string } 
}) {
  const router = useRouter();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [showMenuForMessage, setShowMenuForMessage] = useState<string | null>(null);

  useEffect(() => {
    loadConversationAndMessages();
    
    // リアルタイム更新の設定
    const channel = supabase
      .channel(`messages:${params.conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${params.conversationId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // 新しいメッセージが追加された場合
            const newMessage = payload.new as Message;
            
            // 送信者のプロフィール情報を取得
            const { data: senderProfile } = await supabase
              .from("profiles")
              .select("id, full_name")
              .eq("id", newMessage.sender_id)
              .single();
            
            setMessages(prev => [...prev, {
              ...newMessage,
              sender_profile: senderProfile || undefined
            }]);
            
            // 自分宛てのメッセージなら既読にする
            if (currentUser && newMessage.receiver_id === currentUser.id && !newMessage.read_status) {
              await supabase
                .from("messages")
                .update({ read_status: true })
                .eq("id", newMessage.id);
            }
          } else if (payload.eventType === 'UPDATE') {
            // メッセージが更新された場合（編集・削除）
            const updatedMessage = payload.new as Message;
            setMessages(prev => prev.map(msg => 
              msg.id === updatedMessage.id 
                ? { ...updatedMessage, sender_profile: msg.sender_profile }
                : msg
            ));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.conversationId, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 外部クリックでメニューを閉じる
  useEffect(() => {
    const handleClickOutside = () => {
      setShowMenuForMessage(null);
    };

    if (showMenuForMessage) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [showMenuForMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversationAndMessages = async () => {
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

      // 会話情報を取得
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", params.conversationId)
        .single();

      if (convError || !convData) {
        console.error("Error fetching conversation:", convError);
        router.push("/messages");
        return;
      }

      // アクセス権限チェック
      if (convData.client_id !== user.id && convData.pm_id !== user.id) {
        router.push("/messages");
        return;
      }

      // プロジェクト情報を別途取得
      const { data: projectData } = await supabase
        .from("projects")
        .select("id, title")
        .eq("id", convData.project_id)
        .single();

      // プロフィール情報を別途取得
      const [clientProfile, pmProfile] = await Promise.all([
        supabase.from("profiles").select("id, full_name").eq("id", convData.client_id).single(),
        supabase.from("profiles").select("id, full_name").eq("id", convData.pm_id).single()
      ]);

      // application_id を取得
      const { data: applicationData } = await supabase
        .from("applications")
        .select("id")
        .eq("project_id", convData.project_id)
        .eq("pm_id", convData.pm_id)
        .single();

      const conversationWithDetails = {
        ...convData,
        project: projectData,
        client_profile: clientProfile.data,
        pm_profile: pmProfile.data,
        application_id: applicationData?.id
      };

      setConversation(conversationWithDetails);

      // メッセージを取得（削除されたメッセージも含む）
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", params.conversationId)
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
          .filter(m => m.receiver_id === user.id && !m.read_status)
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
      setLoading(false);
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !conversation || !currentUser) return;
    
    setSending(true);
    
    try {
      const receiverId = conversation.client_id === currentUser.id 
        ? conversation.pm_id 
        : conversation.client_id;

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: params.conversationId,
          sender_id: currentUser.id,
          receiver_id: receiverId,
          content: newMessage.trim(),
          message_type: "normal",
          project_id: conversation.project_id,
          application_id: conversation.application_id || null
        })
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        alert("メッセージの送信に失敗しました");
      } else if (data) {
        // メッセージをローカルに追加
        setMessages(prev => [...prev, {
          ...data,
          sender_profile: { full_name: userProfile?.full_name || null }
        }]);
        setNewMessage("");

        // 会話の最終メッセージ時刻を更新
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", params.conversationId);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("エラーが発生しました");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  const otherUser = userProfile?.user_type === 'client' 
    ? conversation.pm_profile 
    : conversation.client_profile;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/messages">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  戻る
                </Button>
              </Link>
              <div>
                <h1 className="font-semibold">{otherUser?.full_name || 'ユーザー'}</h1>
                <p className="text-sm text-gray-500">{conversation.project?.title}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">メッセージを送信して会話を始めましょう</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const isMyMessage = message.sender_id === currentUser?.id;
                const showDate = index === 0 || 
                  formatDate(message.created_at) !== formatDate(messages[index - 1].created_at);

                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="text-center my-4">
                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {formatDate(message.created_at)}
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
                        
                        <div className="relative group">
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
                            <>
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
                              
                              {/* 自分のメッセージにのみメニューボタンを表示 */}
                              {isMyMessage && (
                                <div className="absolute -right-10 top-0 group-hover:opacity-100 transition-opacity z-10" style={{ opacity: 1 }}>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowMenuForMessage(
                                        showMenuForMessage === message.id ? null : message.id
                                      );
                                    }}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                  
                                  {showMenuForMessage === message.id && (
                                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg z-10 border">
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
                            </>
                          )}
                        </div>
                        
                        <p className={`text-xs text-gray-500 mt-1 ${
                          isMyMessage ? 'text-right' : 'text-left'
                        }`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* メッセージ入力エリア */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={sendMessage} className="flex gap-2">
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
      </div>
    </div>
  );
}