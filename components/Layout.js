
"use client";

import { Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter } from 'next/navigation';
import { message } from 'antd';

export default function Layout({ children, showHeader = false }) {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      message.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      message.error('Logout failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {showHeader && (
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                MyApp
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {user?.email}
                </span>
                <Button 
                  type="primary" 
                  danger 
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}
      <main className={showHeader ? 'py-8' : ''}>
        {children}
      </main>
    </div>
  );
}