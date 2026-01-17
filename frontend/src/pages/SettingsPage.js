import React, { useState, useEffect } from 'react';
import { useAuth } from '@/App';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Bell, Lock, Eye, Trash2, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { API } from '@/App';

const SettingsPage = () => {
  const { user, token, loading: authLoading, logout } = useAuth();

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Privacy Settings
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [showEmail, setShowEmail] = useState(false);

  // Password change
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get(`${API}/users/me/settings`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const settings = response.data;

        // Set notification settings
        if (settings.notifications) {
          setEmailNotifications(settings.notifications.email ?? true);
          setPushNotifications(settings.notifications.push ?? true);
          setWeeklyDigest(settings.notifications.weeklyDigest ?? false);
        }

        // Set privacy settings
        if (settings.privacy) {
          setProfileVisibility(settings.privacy.profileVisible ?? true);
          setShowActivity(settings.privacy.showActivity ?? true);
          setShowEmail(settings.privacy.showEmail ?? false);
        }
      } catch (error) {
        toast.error('Failed to load settings');
        console.error('Settings load error:', error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch settings after auth is complete and we have a token
    if (!authLoading && token) {
      fetchSettings();
    } else if (!authLoading && !token) {
      setLoading(false);
    }
  }, [token, authLoading]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/users/me/settings`, {
        notifications: {
          email: emailNotifications,
          push: pushNotifications,
          weeklyDigest: weeklyDigest,
        },
        privacy: {
          profileVisible: profileVisibility,
          showActivity: showActivity,
          showEmail: showEmail,
        },
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Settings save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setChangingPassword(true);
    try {
      await axios.post(`${API}/users/me/change-password`, {
        currentPassword,
        newPassword,
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      toast.success('Password changed successfully!');
      setPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
      console.error('Password change error:', error);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password');
      return;
    }

    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setDeletingAccount(true);
    try {
      await axios.post(`${API}/users/me/delete-account`, {
        password: deletePassword,
        confirmation: deleteConfirmation,
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      toast.success('Account deleted successfully');
      setDeleteDialogOpen(false);
      // Logout and redirect
      setTimeout(() => {
        logout();
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete account');
      console.error('Account deletion error:', error);
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">
          Manage your account preferences and site settings
        </p>

        {/* Notifications */}
        <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-white">Notifications</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Email Notifications</Label>
                <p className="text-sm text-gray-400">
                  Receive email updates about your activity
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <Separator className="bg-gray-800" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Push Notifications</Label>
                <p className="text-sm text-gray-400">
                  Get notified about new messages and replies
                </p>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
            <Separator className="bg-gray-800" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Weekly Digest</Label>
                <p className="text-sm text-gray-400">
                  Receive a weekly summary of platform activity
                </p>
              </div>
              <Switch
                checked={weeklyDigest}
                onCheckedChange={setWeeklyDigest}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <CardTitle className="text-white">Privacy</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Control who can see your information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Public Profile</Label>
                <p className="text-sm text-gray-400">
                  Make your profile visible to everyone
                </p>
              </div>
              <Switch
                checked={profileVisibility}
                onCheckedChange={setProfileVisibility}
              />
            </div>
            <Separator className="bg-gray-800" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Show Activity</Label>
                <p className="text-sm text-gray-400">
                  Display your recent posts and contributions
                </p>
              </div>
              <Switch
                checked={showActivity}
                onCheckedChange={setShowActivity}
              />
            </div>
            <Separator className="bg-gray-800" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Show Email</Label>
                <p className="text-sm text-gray-400">
                  Display your email on your profile
                </p>
              </div>
              <Switch checked={showEmail} onCheckedChange={setShowEmail} />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-white">Security</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Manage your account security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white mb-2 block">Password</Label>
              <Dialog
                open={passwordDialogOpen}
                onOpenChange={setPasswordDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-gray-700 text-white hover:bg-gray-900"
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Enter your current password and choose a new one
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="current-password">
                        Current Password
                      </Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="bg-[#0a0a0a] border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-[#0a0a0a] border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm-password">
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-[#0a0a0a] border-gray-700 text-white"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="bg-gradient-to-r from-[#0ea5e9] to-[#14b8a6]"
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Changing...
                        </>
                      ) : (
                        'Change Password'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Separator className="bg-gray-800" />
            <div>
              <Label className="text-white mb-2 block">
                Two-Factor Authentication
              </Label>
              <Button
                variant="outline"
                className="border-gray-700 text-white hover:bg-gray-900"
                disabled
              >
                <Shield className="mr-2 h-4 w-4" />
                Enable 2FA (Coming Soon)
              </Button>
              <p className="text-sm text-gray-400 mt-2">
                Add an extra layer of security to your account
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-[#1a1a1a] border-red-900/30 mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              <CardTitle className="text-red-500">Danger Zone</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Irreversible actions for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
                <DialogHeader>
                  <DialogTitle className="text-red-500">Delete Account</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    This action cannot be undone. This will permanently delete your account
                    and remove all your data from our servers.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="delete-password">
                      Password
                    </Label>
                    <Input
                      id="delete-password"
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="bg-[#0a0a0a] border-gray-700 text-white"
                      placeholder="Enter your password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="delete-confirmation">
                      Type DELETE to confirm
                    </Label>
                    <Input
                      id="delete-confirmation"
                      type="text"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      className="bg-[#0a0a0a] border-gray-700 text-white"
                      placeholder="DELETE"
                    />
                  </div>
                  <p className="text-sm text-gray-400">
                    This will delete all your posts, questions, answers, comments, and trophies.
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deletingAccount ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Account Permanently'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <p className="text-sm text-gray-400 mt-2">
              Permanently delete your account and all associated data
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full bg-gradient-to-r from-[#0ea5e9] to-[#14b8a6] text-white btn-primary"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save All Settings'
          )}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;