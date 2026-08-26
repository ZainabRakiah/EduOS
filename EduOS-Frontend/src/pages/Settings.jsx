import React, { useEffect, useState } from 'react';
import { User, Lock, Save, Check, AlertCircle, X, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@hooks';
import {
  fetchProfile,
  updateProfile,
  changePassword,
  selectProfile,
  selectSettingsLoading,
  selectSettingsUpdating,
  selectSuccessMessage,
  selectSettingsError,
  resetSettingsError,
  resetSuccessMessage,
} from '@redux/slices/settings.slice.js';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Avatar,
  Separator,
} from '@components/ui/index.jsx';

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: 'bg-success-50 border-success-500/30 text-success-700',
    error: 'bg-danger-50 border-danger-500/30 text-danger-700',
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${colors[type]}`}
      >
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Banner({ message, type }) {
  const colors = {
    success: 'bg-success-50 border-success-500/30 text-success-700',
    error: 'bg-danger-50 border-danger-500/30 text-danger-700',
  };
  const icons = {
    success: <Check className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
  };
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${colors[type]}`}>
      <div className="shrink-0 pt-0.5">{icons[type]}</div>
      <div className="flex-1 text-sm font-medium">{message}</div>
    </div>
  );
}

const getInitials = (firstName, lastName) => {
  const f = firstName ? firstName[0] : '';
  const l = lastName ? lastName[0] : '';
  return (f + l).toUpperCase();
};

export default function Settings() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectProfile);
  const loading = useAppSelector(selectSettingsLoading);
  const updating = useAppSelector(selectSettingsUpdating);
  const successMessage = useAppSelector(selectSuccessMessage);
  const error = useAppSelector(selectSettingsError);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [className, setClassName] = useState('');
  const [school, setSchool] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setClassName(profile.className || profile.class || '');
      setSchool(profile.school || '');
      setEmail(profile.email || '');
      setAvatarUrl(profile.avatarUrl || profile.avatar || '');
    }
  }, [profile]);

  useEffect(() => {
    if (successMessage) {
      showToast(successMessage, 'success');
      setTimeout(() => dispatch(resetSuccessMessage()), 100);
    }
  }, [successMessage, dispatch]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      dispatch(resetSettingsError());
    }
  }, [error, dispatch]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await dispatch(
        updateProfile({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          className: className.trim() || undefined,
          school: school.trim() || undefined,
          avatarUrl: avatarUrl.trim() || undefined,
        }),
      ).unwrap();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
    } catch (_) {}
  };

  const validatePasswords = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return false;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!validatePasswords()) return;
    try {
      await dispatch(
        changePassword({
          currentPassword,
          newPassword,
        }),
      ).unwrap();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (_) {}
  };

  const displayInitials =
    profile?.firstName || profile?.lastName
      ? getInitials(profile.firstName, profile.lastName)
      : firstName || lastName
        ? getInitials(firstName, lastName)
        : 'U';

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-neutral-500 text-sm">Manage your profile and account settings.</p>
      </div>

      {successMessage && !toast && <Banner message={successMessage} type="success" />}
      {error && !toast && <Banner message={error} type="error" />}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <User className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription className="text-xs">
                Update your personal information
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6 pb-6 border-b border-neutral-100">
              <div className="flex flex-col items-center gap-3 shrink-0">
                {loading ? (
                  <div className="h-20 w-20 rounded-full bg-neutral-200 animate-pulse" />
                ) : avatarUrl ? (
                  <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-neutral-100 bg-neutral-50">
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <Avatar size="xl" fallback={displayInitials} />
                )}
              </div>
              <div className="flex-1 w-full">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Avatar URL</label>
                  <Input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />
                  <p className="text-xs text-neutral-500">
                    Paste a link to your profile image. Leave blank to use initials.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">First Name</label>
                <Input
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Last Name</label>
                <Input
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Class</label>
                <Input
                  placeholder="e.g. Grade 10"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">School</label>
                <Input
                  placeholder="Your school name"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
                />
                <p className="text-xs text-neutral-500">
                  Contact support to change your email address.
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-end gap-2">
              <Button
                type="submit"
                disabled={updating || loading}
                leftIcon={
                  updating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )
                }
              >
                {updating ? 'Updating...' : 'Update Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-warning-50 text-warning-600 flex items-center justify-center">
              <Lock className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-base">Password</CardTitle>
              <CardDescription className="text-xs">Change your account password</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">Current Password</label>
              <Input
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={updating}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">New Password</label>
                <Input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={updating}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Confirm New Password</label>
                <Input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={updating}
                />
              </div>
            </div>

            {passwordError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-50 border border-danger-500/20">
                <AlertCircle className="h-4 w-4 text-danger-600 shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-danger-700">{passwordError}</span>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-end gap-2">
              <Button
                type="submit"
                disabled={updating}
                leftIcon={
                  updating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )
                }
              >
                {updating ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
