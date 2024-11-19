
import React from 'react';
import Header from './Header';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-3xl border-gray-200 dark:border-gray-800 dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert">
            <p>Last updated: November 19, 2024</p>

            <h2>1. Agreement to Terms</h2>
            <p>By accessing or using BriefSnap, you agree to be bound by these Terms of Service.</p>

            <h2>2. Use License</h2>
            <p>We grant you a personal, non-transferable license to use BriefSnap for personal, non-commercial purposes.</p>

            <h2>3. User Responsibilities</h2>
            <ul>
              <li>You must provide accurate registration information</li>
              <li>You are responsible for maintaining account security</li>
              <li>You agree not to misuse or abuse the service</li>
            </ul>

            <h2>4. Content</h2>
            <p>All content provided through BriefSnap is for informational purposes only. We do not guarantee accuracy or completeness of any content.</p>

            <h2>5. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of new terms.</p>

            <h2>6. Limitation of Liability</h2>
            <p>BriefSnap shall not be liable for any indirect, incidental, special, or consequential damages.</p>

            <h2>7. Contact Information</h2>
            <p>For questions about these Terms, please contact us at: contact@briefsnap.com</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}