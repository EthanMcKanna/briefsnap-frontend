
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

export default function SitemapXML() {
  useEffect(() => {
    const generateSitemap = async () => {
      try {
        const articlesRef = collection(db, 'articles');
        const q = query(articlesRef, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);

        const baseUrl = window.location.origin;
        const articles = querySnapshot.docs.map(doc => ({
          url: `${baseUrl}/article/${doc.data().slug}`,
          lastmod: doc.data().timestamp?.toDate()?.toISOString()
        }));

        const staticPages = [
          { url: baseUrl, lastmod: new Date().toISOString() },
          { url: `${baseUrl}/articles`, lastmod: new Date().toISOString() },
          { url: `${baseUrl}/sitemap`, lastmod: new Date().toISOString() }
        ];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${[...staticPages, ...articles]
    .map(page => `
    <url>
      <loc>${page.url}</loc>
      <lastmod>${page.lastmod}</lastmod>
      <changefreq>${page.url === baseUrl ? 'daily' : 'weekly'}</changefreq>
      <priority>${page.url === baseUrl ? '1.0' : '0.8'}</priority>
    </url>
  `).join('')}
</urlset>`;

        const blob = new Blob([xml], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

      } catch (error) {
        console.error('Error generating sitemap:', error);
      }
    };

    generateSitemap();
  }, []);

  return null;
}