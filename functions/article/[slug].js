export async function onRequest(context) {
  const { params, request, env } = context;
  const slug = params.slug;
  const userAgent = request.headers.get('User-Agent') || '';
  
  // Check if it's a social media crawler
  const isCrawler = /facebookexternalhit|twitterbot|WhatsApp|SkypeUriPreview|LinkedInBot|SlackBot|TelegramBot|iMessageLinkPreview|bot|crawler|spider|scraper/i.test(userAgent);
  
  if (!isCrawler) {
    // If not a crawler, serve the normal SPA
    return env.ASSETS.fetch(request);
  }

  try {
    // First, try to serve the static pre-generated file
    const staticResponse = await env.ASSETS.fetch(new Request(`${request.url}.html`));
    if (staticResponse.ok) {
      return staticResponse;
    }
    
    // If no static file exists, generate meta tags dynamically
    console.log(`Generating dynamic meta tags for article: ${slug}`);
    
    const articleData = await fetchArticleFromFirestore(slug, env);
    
    if (!articleData) {
      // Article not found, serve the normal SPA
      return env.ASSETS.fetch(request);
    }

    const html = generateArticleHTML(articleData, slug);
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error generating dynamic meta tags:', error);
    return env.ASSETS.fetch(request);
  }
}

async function fetchArticleFromFirestore(slug, env) {
  try {
    // Use Firestore REST API
    const projectId = env.FIREBASE_PROJECT_ID || 'briefsnap-19b9a';
    
    // Query for the article by slug
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/articles?pageSize=1000`
    );
    
    if (!response.ok) {
      throw new Error(`Firestore API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.documents) {
      const article = data.documents.find(doc => {
        const fields = doc.fields;
        return fields.slug && fields.slug.stringValue === slug;
      });
      
      if (article) {
        const fields = article.fields;
        return {
          title: fields.title?.stringValue || '',
          description: fields.description?.stringValue || '',
          img_url: fields.img_url?.stringValue || null,
          topic: fields.topic?.stringValue || null,
          timestamp: fields.timestamp?.timestampValue || null,
          slug: fields.slug?.stringValue || '',
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching article from Firestore:', error);
    return null;
  }
}

function generateArticleHTML(article, slug) {
  const baseUrl = 'https://briefsnap.com';
  const articleUrl = `${baseUrl}/article/${slug}`;
  const imageUrl = article.img_url || `${baseUrl}/logo512.png`;
  
  const escapeHtml = (text) => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };
  
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
    ${article.timestamp ? `<meta property="article:published_time" content="${article.timestamp}" />` : ''}
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
        window.location.replace('${articleUrl}');
    </script>
    
    <!-- Fallback for no-JS -->
    <meta http-equiv="refresh" content="0; url=${articleUrl}" />
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
        <h1>${escapeHtml(article.title)}</h1>
        ${article.img_url ? `<img src="${article.img_url}" alt="${escapeHtml(article.title)}" style="max-width: 100%; height: auto; margin: 20px 0;" />` : ''}
        <p>${escapeHtml(article.description || 'Read this article on BriefSnap')}</p>
        <p><a href="${articleUrl}" style="color: #3b82f6;">Continue reading on BriefSnap →</a></p>
    </div>
</body>
</html>`;
} 