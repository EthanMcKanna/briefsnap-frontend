import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

export default function SitemapXML() {
  const [xmlContent, setXmlContent] = useState('');

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.httpEquiv = "Content-Type";
    meta.content = "application/xml";
    document.getElementsByTagName('head')[0].appendChild(meta);

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

        setXmlContent(xml);
      } catch (error) {
        console.error('Error generating sitemap:', error);
      }
    };

    generateSitemap();

    return () => {
      document.getElementsByTagName('head')[0].removeChild(meta);
    };
  }, []);

  return (
    <div dangerouslySetInnerHTML={{ __html: xmlContent }} />
  );
}