import React, { useState } from 'react';
import { useAuth } from '@/App';
import { API } from '@/App';
import axios from 'axios';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

const ProfileEditPage = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    location: user?.location || '',
    githubUrl: user?.githubUrl || '',
    linkedinUrl: user?.linkedinUrl || '',
    websiteUrl: user?.websiteUrl || '',
    skills: user?.skills?.join(', ') || '',
    interests: user?.interests?.join(', ') || ''
  });
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
        interests: formData.interests.split(',').map(i => i.trim()).filter(i => i)
      };
      const response = await axios.put(`${API}/users/me`, updateData);
      updateUser(response.data);
      toast.success('✅ Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAvatarLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        const response = await axios.post(`${API}/users/avatar`, { avatar: base64 });
        updateUser({ ...user, avatar: response.data.avatar });
        toast.success('✅ Avatar updated!');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload avatar');
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

        {/* Avatar Section */}
        <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Profile Picture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} />
                <AvatarFallback className="text-2xl">{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  data-testid="avatar-upload-input"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('avatar-upload').click()}
                  disabled={avatarLoading}
                  data-testid="avatar-upload-btn"
                >
                  {avatarLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload New Avatar
                </Button>
                <p className="text-xs text-gray-400 mt-2">JPG, PNG or GIF. Max 5MB.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Full Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-[#0a0a0a] border-gray-700 text-white mt-2"
                    data-testid="settings-name-input"
                  />
                </div>
                <div>
                  <Label className="text-white">Location</Label>
                  <Input
                    placeholder="City, Country"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="bg-[#0a0a0a] border-gray-700 text-white mt-2"
                    data-testid="settings-location-input"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">Bio</Label>
                <Textarea
                  placeholder="Tell us about yourself..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="bg-[#0a0a0a] border-gray-700 text-white mt-2"
                  data-testid="settings-bio-input"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">GitHub URL</Label>
                  <Input
                    placeholder="https://github.com/username"
                    value={formData.githubUrl}
                    onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                    className="bg-[#0a0a0a] border-gray-700 text-white mt-2"
                    data-testid="settings-github-input"
                  />
                </div>
                <div>
                  <Label className="text-white">LinkedIn URL</Label>
                  <Input
                    placeholder="https://linkedin.com/in/username"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    className="bg-[#0a0a0a] border-gray-700 text-white mt-2"
                    data-testid="settings-linkedin-input"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">Website URL</Label>
                <Input
                  placeholder="https://yourwebsite.com"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white mt-2"
                  data-testid="settings-website-input"
                />
              </div>

              <div>
                <Label className="text-white">Skills (comma separated)</Label>
                <Input
                  placeholder="React, Node.js, Python"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white mt-2"
                  data-testid="settings-skills-input"
                />
              </div>

              <div>
                <Label className="text-white">Interests (comma separated)</Label>
                <Input
                  placeholder="Web Development, Machine Learning"
                  value={formData.interests}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white mt-2"
                  data-testid="settings-interests-input"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#0ea5e9] to-[#14b8a6] text-white btn-primary"
                disabled={loading}
                data-testid="settings-save-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileEditPage;