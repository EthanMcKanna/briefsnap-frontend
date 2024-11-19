
import React from 'react';
import Header from './Header';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-3xl border-gray-200 dark:border-gray-800 dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert">
            <p>Last updated: November 19, 2024</p>
            
            <h2>1. Information We Collect</h2>
            <p>We collect information you provide directly to us when using BriefSnap, including:</p>
            <ul>
              <li>Account information (email, username)</li>
              <li>Reading preferences and bookmarks</li>
              <li>Usage data and interactions with our service</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul>
              <li>Provide and maintain our service</li>
              <li>Personalize your news experience</li>
              <li>Improve our services</li>
              <li>Communicate with you about updates</li>
            </ul>

            <h2>3. Data Security</h2>
            <p>We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.</p>

            <h2>4. Third-Party Services</h2>
            <p>We may use third-party services that collect, monitor, and analyze data to improve our service.</p>

            <h2>5. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please contact us at: contact@briefsnap.com</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}