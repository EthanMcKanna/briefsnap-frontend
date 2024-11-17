import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { OpenAI } from 'openai';

let firebaseApp;
const RATE_LIMIT = 5;
const rateLimits = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = rateLimits.get(userId) || [];
  const recentRequests = userRequests.filter(time => now - time < 60000);

  if (recentRequests.length >= RATE_LIMIT) {
    return false;
  }

  recentRequests.push(now);
  rateLimits.set(userId, recentRequests);
  return true;
}

async function initializeFirebase(context) {
  if (!firebaseApp) {
    try {
      const credentials = JSON.parse(context.env.FIREBASE_ADMIN_CREDENTIALS);
      firebaseApp = initializeApp({
        credential: cert(credentials),
        // Add explicit Node.js environment settings
        projectId: credentials.project_id,
        databaseURL: `https://${credentials.project_id}.firebaseio.com`,
      });
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw new Error('Internal server configuration error');
    }
  }
  return getFirestore(firebaseApp);
}

export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { text, articleId, user } = await context.request.json();

    if (!text?.trim() || !articleId || !user?.uid) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!checkRateLimit(user.uid)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const db = await initializeFirebase(context);

    try {
      const openai = new OpenAI({ apiKey: context.env.OPENAI_API_KEY });
      const moderation = await openai.moderations.create({ input: text });
      const result = moderation.results[0];

      if (result.flagged) {
        return new Response(
          JSON.stringify({
            flagged: true,
            categories: result.categories,
            message: 'Content was flagged by moderation',
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    } catch (error) {
      console.error('OpenAI moderation error:', error);
      return new Response(
        JSON.stringify({ error: 'Content moderation service unavailable' }),
        { status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    try {
      const commentRef = await db.collection('comments').add({
        content: text.trim(),
        articleId,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || '',
        timestamp: new Date(),
        likes: 0,
        likedBy: [],
      });

      return new Response(
        JSON.stringify({
          flagged: false,
          message: 'Comment added successfully',
          commentId: commentRef.id,
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } catch (error) {
      console.error('Firebase write error:', error);
      throw new Error('Failed to save comment');
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
