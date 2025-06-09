const fs = require('fs');
const path = require('path');

// You'll need to install firebase-admin: npm install firebase-admin
const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set up service account)
if (!admin.apps.length) {
  // You can either use a service account key file or environment variables
  // For Cloudflare Pages, use environment variables
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

function generateArticleHTML(article, baseUrl = 'https://briefsnap.com') {
  const articleUrl = `${baseUrl}/article/${article.slug}`;
  const imageUrl = article.img_url || `${baseUrl}/logo512.png`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(article.title)} | BriefSnap</title>
    <meta name="description" content="${escapeHtml(article.description || 'Read this article on BriefSnap')}" />
    <link rel="canonical" href="${articleUrl}" />
    
    <!-- Open Graph meta tags -->
    <meta property="og:title" content="${escapeHtml(article.title)}" />
    <meta property="og:description" content="${escapeHtml(article.description || 'Read this article on BriefSnap')}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${articleUrl}" />
    <meta property="og:site_name" content="BriefSnap" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:alt" content="${escapeHtml(article.title)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    ${article.timestamp ? `<meta property="article:published_time" content="${article.timestamp.toDate().toISOString()}" />` : ''}
    ${article.topic ? `<meta property="article:section" content="${escapeHtml(article.topic)}" />` : ''}
    
    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@briefsnap" />
    <meta name="twitter:title" content="${escapeHtml(article.title)}" />
    <meta name="twitter:description" content="${escapeHtml(article.description || 'Read this article on BriefSnap')}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="twitter:image:alt" content="${escapeHtml(article.title)}" />
    
    <!-- Redirect to React app -->
    <script>
        // Immediately redirect to the React app
        window.location.replace('/#/article/${article.slug}');
    </script>
    
    <!-- Fallback for no-JS -->
    <meta http-equiv="refresh" content="0; url=/#/article/${article.slug}" />
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
        <h1>${escapeHtml(article.title)}</h1>
        ${article.img_url ? `<img src="${article.img_url}" alt="${escapeHtml(article.title)}" style="max-width: 100%; height: auto; margin: 20px 0;" />` : ''}
        <p>${escapeHtml(article.description || 'Read this article on BriefSnap')}</p>
        <p><a href="/#/article/${article.slug}" style="color: #3b82f6;">Continue reading on BriefSnap →</a></p>
        <script>
            // Auto-redirect after a short delay for fallback
            setTimeout(() => {
                if (window.location.hash !== '#/article/${article.slug}') {
                    window.location.href = '/#/article/${article.slug}';
                }
            }, 100);
        </script>
    </div>
</body>
</html>`;
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function generateMetaPages() {
  try {
    console.log('Fetching articles from Firebase...');
    
    const articlesSnapshot = await db.collection('articles')
      .orderBy('timestamp', 'desc')
      .limit(1000) // Adjust as needed
      .get();
    
    const outputDir = path.join(__dirname, '../build/article');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`Generating meta pages for ${articlesSnapshot.size} articles...`);
    
    for (const doc of articlesSnapshot.docs) {
      const article = { id: doc.id, ...doc.data() };
      
      if (!article.slug) {
        console.warn(`Skipping article ${article.id} - no slug`);
        continue;
      }
      
      const html = generateArticleHTML(article);
      const filePath = path.join(outputDir, `${article.slug}.html`);
      
      fs.writeFileSync(filePath, html);
      console.log(`Generated: ${filePath}`);
    }
    
    console.log('✅ Meta pages generation complete!');
    
  } catch (error) {
    console.error('❌ Error generating meta pages:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateMetaPages();
}

module.exports = { generateMetaPages }; 