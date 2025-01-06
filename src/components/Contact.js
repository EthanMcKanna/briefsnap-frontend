import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Mail } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';

export default function Contact() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <Helmet>
        <title>Contact Us - BriefSnap</title>
        <meta name="description" content="Get in touch with the BriefSnap team" />
      </Helmet>
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <div className="text-center mb-8">
            <Mail className="w-12 h-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Contact Us</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Have questions or feedback? I'd love to hear from you.
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Please email BriefSnap at:
            </p>
            <a 
              href="mailto:contact@briefsnap.com"
              className="text-lg font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              contact@briefsnap.com
            </a>
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              I aim to respond to all email within 24 hours.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
