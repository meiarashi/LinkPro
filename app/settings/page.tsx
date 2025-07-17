"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { createClient } from "../../utils/supabase/client";
import LoggedInHeader from "../../components/LoggedInHeader";
import { 
  Loader2, 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Trash2,
  AlertCircle,
  Check
} from "lucide-react";
import { LoadingPage } from "../../components/ui/loading";

interface Profile {
  id: string;
  user_type: string;
  full_name: string | null;
  email?: string;
  profile_details?: any;
  rate_info?: any;
  contact_info?: any;
  availability?: any;
  notification_settings?: {
    email_notifications: boolean;
    new_message: boolean;
    new_application: boolean;
    application_status: boolean;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // フォームの状態
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newMessageNotif, setNewMessageNotif] = useState(true);
  const [newApplicationNotif, setNewApplicationNotif] = useState(true);
  const [applicationStatusNotif, setApplicationStatusNotif] = useState(true);
  
  
  // UI状態
  const [activeSection, setActiveSection] = useState("account");
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        router.push("/login");
        return;
      }
      
      setUser(currentUser);
      setEmail(currentUser.email || "");

      // プロフィール情報を取得
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else if (profileData) {
        setProfile({
          ...profileData,
          email: currentUser.email
        });
        
        // 通知設定を読み込み
        if (profileData.notification_settings) {
          const notif = profileData.notification_settings;
          setEmailNotifications(notif.email_notifications ?? true);
          setNewMessageNotif(notif.new_message ?? true);
          setNewApplicationNotif(notif.new_application ?? true);
          setApplicationStatusNotif(notif.application_status ?? true);
        }
        
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ email });

      if (error) {
        setMessage({ type: 'error', text: 'メールアドレスの更新に失敗しました' });
      } else {
        setMessage({ type: 'success', text: '確認メールを送信しました。メールを確認してください。' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '新しいパスワードが一致しません' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'パスワードは6文字以上にしてください' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setMessage({ type: 'error', text: 'パスワードの更新に失敗しました' });
      } else {
        setMessage({ type: 'success', text: 'パスワードを更新しました' });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' });
    } finally {
      setSaving(false);
    }
  };


  const handleNotificationUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const notificationSettings = {
        email_notifications: emailNotifications,
        new_message: newMessageNotif,
        new_application: newApplicationNotif,
        application_status: applicationStatusNotif
      };

      const { error } = await supabase
        .from("profiles")
        .update({ 
          notification_settings: notificationSettings,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (error) {
        setMessage({ type: 'error', text: '通知設定の更新に失敗しました' });
      } else {
        setMessage({ type: 'success', text: '通知設定を更新しました' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' });
    } finally {
      setSaving(false);
    }
  };

  const handleAccountDelete = async () => {
    if (deleteConfirmText !== "DELETE") {
      setMessage({ type: 'error', text: '確認テキストが正しくありません' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Supabase Authのユーザーを削除
      // ユーザー自身が自分のアカウントを削除する場合は、このAPIを使用
      const { data, error } = await supabase.rpc('delete_user');
      
      if (error) {
        // RPCが存在しない場合は、プロフィールに削除フラグを立てる代替案
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ 
            deleted_at: new Date().toISOString(),
            visibility: false
          })
          .eq("id", user.id);
          
        if (profileError) {
          setMessage({ type: 'error', text: 'アカウントの削除に失敗しました' });
          return;
        }
      }
      
      // ログアウトしてトップページへ
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error('Delete account error:', error);
      setMessage({ type: 'error', text: 'エラーが発生しました' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>プロフィール情報が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <LoggedInHeader userProfile={profile} userEmail={user?.email} />

      {/* メインコンテンツ */}
      <main className="container mx-auto p-4 md:p-8 max-w-6xl">
        {/* ページタイトル */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">アカウント設定</h1>
          <p className="mt-2 text-gray-600">アカウントの設定を管理します</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* サイドメニュー */}
          <div className="md:w-64">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveSection("account")}
                className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-2 ${
                  activeSection === "account"
                    ? "bg-primary text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <User className="w-4 h-4" />
                アカウント情報
              </button>
              <button
                onClick={() => setActiveSection("security")}
                className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-2 ${
                  activeSection === "security"
                    ? "bg-primary text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Lock className="w-4 h-4" />
                セキュリティ
              </button>
              <button
                onClick={() => setActiveSection("notifications")}
                className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-2 ${
                  activeSection === "notifications"
                    ? "bg-primary text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Bell className="w-4 h-4" />
                通知設定
              </button>
              <button
                onClick={() => setActiveSection("danger")}
                className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-2 ${
                  activeSection === "danger"
                    ? "bg-red-600 text-white"
                    : "text-red-600 hover:bg-red-50"
                }`}
              >
                <Trash2 className="w-4 h-4" />
                アカウント削除
              </button>
            </nav>
          </div>

          {/* コンテンツエリア */}
          <div className="flex-1">
            {/* メッセージ表示 */}
            {message && (
              <div className={`mb-4 p-4 rounded-md flex items-center gap-2 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-red-50 text-red-800'
              }`}>
                {message.type === 'success' ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                {message.text}
              </div>
            )}


            {/* アカウント情報 */}
            {activeSection === "account" && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  メールアドレス
                </h2>
                <form onSubmit={handleEmailUpdate} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      メールアドレス
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      変更後、新しいメールアドレスに確認メールが送信されます
                    </p>
                  </div>
                  <Button type="submit" disabled={saving || email === user?.email}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        更新中...
                      </>
                    ) : (
                      'メールアドレスを更新'
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* セキュリティ */}
            {activeSection === "security" && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  パスワード変更
                </h2>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      新しいパスワード
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      新しいパスワード（確認）
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" disabled={saving || !newPassword || !confirmPassword}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        更新中...
                      </>
                    ) : (
                      'パスワードを更新'
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* 通知設定 */}
            {activeSection === "notifications" && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  通知設定
                </h2>
                <form onSubmit={handleNotificationUpdate} className="space-y-4">
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">メール通知を受け取る</span>
                    </label>
                    
                    {emailNotifications && (
                      <div className="ml-6 space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newMessageNotif}
                            onChange={(e) => setNewMessageNotif(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">新着メッセージ</span>
                        </label>
                        
                        {profile.user_type === 'client' && (
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newApplicationNotif}
                              onChange={(e) => setNewApplicationNotif(e.target.checked)}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">新規応募</span>
                          </label>
                        )}
                        
                        {profile.user_type === 'pro' && (
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={applicationStatusNotif}
                              onChange={(e) => setApplicationStatusNotif(e.target.checked)}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">応募ステータス変更</span>
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        更新中...
                      </>
                    ) : (
                      '通知設定を更新'
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* アカウント削除 */}
            {activeSection === "danger" && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-600">
                  <Trash2 className="w-5 h-5" />
                  アカウント削除
                </h2>
                
                {!showDeleteConfirm ? (
                  <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-md">
                      <p className="text-sm text-red-800">
                        <strong>警告:</strong> アカウントを削除すると、以下のデータがすべて失われます：
                      </p>
                      <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                        <li>プロフィール情報</li>
                        <li>プロジェクト</li>
                        <li>メッセージ履歴</li>
                        <li>応募履歴</li>
                      </ul>
                      <p className="mt-2 text-sm text-red-800 font-semibold">
                        この操作は取り消すことができません。
                      </p>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      アカウントを削除する
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700">
                      本当にアカウントを削除しますか？確認のため、下のテキストボックスに「DELETE」と入力してください。
                    </p>
                    
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE と入力"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText("");
                        }}
                      >
                        キャンセル
                      </Button>
                      <Button
                        type="button"
                        className="bg-red-600 hover:bg-red-700"
                        onClick={handleAccountDelete}
                        disabled={saving || deleteConfirmText !== "DELETE"}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            削除中...
                          </>
                        ) : (
                          'アカウントを削除'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}