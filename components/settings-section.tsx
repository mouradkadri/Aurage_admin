'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bell, Lock, Palette, ShoppingCart, Mail, User } from 'lucide-react';

export const SettingsSection: React.FC = () => {
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    lowStock: true,
    newCustomers: false,
    marketingEmails: false,
  });

  const [shopSettings, setShopSettings] = useState({
    storeName: 'Aurage Fragrances',
    email: 'admin@auragefragrances.com',
    currency: 'EUR',
    timezone: 'UTC+1',
  });

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard Settings</h3>
        <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">Manage your store configuration and preferences</p>
      </div>

      {/* Store Settings */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Store Information
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-zinc-400">Basic store configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 block mb-2">Store Name</label>
              <input
                type="text"
                value={shopSettings.storeName}
                onChange={(e) => setShopSettings(prev => ({ ...prev, storeName: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 block mb-2">Email</label>
              <input
                type="email"
                value={shopSettings.email}
                onChange={(e) => setShopSettings(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 block mb-2">Currency</label>
              <select
                value={shopSettings.currency}
                onChange={(e) => setShopSettings(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option>EUR</option>
                <option>USD</option>
                <option>GBP</option>
                <option>JPY</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 block mb-2">Timezone</label>
              <select
                value={shopSettings.timezone}
                onChange={(e) => setShopSettings(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option>UTC+0</option>
                <option>UTC+1</option>
                <option>UTC+2</option>
                <option>UTC-5</option>
              </select>
            </div>
          </div>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">Save Store Settings</Button>
        </CardContent>
      </Card>

      {/* Notifications Settings */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-zinc-400">Configure which notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'orderUpdates', label: 'Order Updates', description: 'Get notified when customers place or update orders' },
            { key: 'lowStock', label: 'Low Stock Alerts', description: 'Receive alerts when products are running low' },
            { key: 'newCustomers', label: 'New Customers', description: 'Notifications for new customer registrations' },
            { key: 'marketingEmails', label: 'Marketing Emails', description: 'Promotional campaigns and newsletters' },
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">{description}</p>
              </div>
              <button
                onClick={() => handleNotificationChange(key as keyof typeof notifications)}
                className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications[key as keyof typeof notifications]
                    ? 'bg-amber-500'
                    : 'bg-gray-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications[key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Security
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-zinc-400">Account security and login management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Password</p>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">Last changed 45 days ago</p>
            </div>
            <Button variant="outline" className="border-gray-300 dark:border-zinc-700 text-xs">
              Change Password
            </Button>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">Enhance your account security</p>
            </div>
            <Badge variant="secondary" className="text-xs">Disabled</Badge>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Active Sessions</p>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">1 active session(s)</p>
            </div>
            <Button variant="outline" className="border-gray-300 dark:border-zinc-700 text-xs">
              Manage Sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5" />
            Account Information
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-zinc-400">Your admin profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 block mb-2">Full Name</label>
              <input
                type="text"
                defaultValue="Aurage Admin"
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 block mb-2">Role</label>
              <input
                type="text"
                defaultValue="Store Owner"
                disabled
                className="w-full px-3 py-2 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-700 dark:text-zinc-400"
              />
            </div>
          </div>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">Update Profile</Button>
        </CardContent>
      </Card>
    </div>
  );
};
