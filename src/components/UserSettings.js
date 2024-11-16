import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Header from './Header';
import { Card, CardHeader, CardContent, CardTitle } from './ui/Card';
import { Settings, Bell, Monitor } from 'lucide-react';

export default function UserSettings() {
  const { user, userPreferences, updatePreferences } = useAuth();
  const { setTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);

  const handlePreferenceChange = async (key, value) => {
    setIsSaving(true);
    await updatePreferences({ [key]: value });
    if (key === 'theme') {
      setTheme(value);
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="max-w-4xl mx-auto p-4">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-gray-100">
              <Settings className="w-5 h-5 mr-2 text-gray-700 dark:text-gray-300" />
              User Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-b dark:border-gray-700 pb-4">
              <div className="flex items-center mb-4">
                <img
                  src={user?.photoURL}
                  alt={user?.displayName}
                  className="w-16 h-16 rounded-full mr-4"
                />
                <div>
                  <h3 className="font-medium text-lg dark:text-gray-100">{user?.displayName}</h3>
                  <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Email Notifications
                  </label>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={userPreferences.emailNotifications}
                    onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                    disabled={isSaving}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Monitor className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Theme Preference
                  </label>
                </div>
                <select
                  value={userPreferences.theme}
                  onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                  disabled={isSaving}
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}