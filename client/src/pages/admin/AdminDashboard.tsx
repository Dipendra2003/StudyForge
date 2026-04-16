import React from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, BarChart3, Activity, Mail } from 'lucide-react';

export default function AdminDashboard() {
  const sections = [
    {
      title: 'User Management',
      description: 'Manage user accounts, roles, and permissions',
      icon: Users,
      path: '/admin/users',
      color: 'text-blue-500',
    },
    {
      title: 'Content Management',
      description: 'Moderate quizzes, flashcards, and documents',
      icon: FileText,
      path: '/admin/content',
      color: 'text-green-500',
    },
    {
      title: 'Analytics',
      description: 'View system metrics and usage statistics',
      icon: BarChart3,
      path: '/admin/analytics',
      color: 'text-purple-500',
    },
    {
      title: 'System Monitoring',
      description: 'Monitor logs, errors, and system health',
      icon: Activity,
      path: '/admin/monitoring',
      color: 'text-orange-500',
    },
    {
      title: 'Email Management',
      description: 'View and manage contact form messages',
      icon: Mail,
      path: '/admin/email',
      color: 'text-pink-500',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to Admin Panel
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select a section to manage your application
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.path} href={section.path}>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${section.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle>{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{section.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
