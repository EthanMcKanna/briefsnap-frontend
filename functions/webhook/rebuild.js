export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // Verify the request is from Firebase (optional but recommended)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.WEBHOOK_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Get the webhook payload
    const payload = await request.json();
    
    // Check if this is a new article creation
    if (payload.eventType === 'google.firestore.document.create' && 
        payload.resource.includes('/articles/')) {
      
      console.log('New article detected, triggering rebuild...');
      
      // Trigger Cloudflare Pages build using the API
      const buildResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${env.CLOUDFLARE_PROJECT_NAME}/deployments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          compatibility_date: '2023-05-18',
          compatibility_flags: [],
        }),
      });
      
      if (buildResponse.ok) {
        console.log('Build triggered successfully');
        return new Response('Build triggered', { status: 200 });
      } else {
        console.error('Failed to trigger build:', await buildResponse.text());
        return new Response('Failed to trigger build', { status: 500 });
      }
    }
    
    return new Response('No action needed', { status: 200 });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
} 