import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const admin = require('firebase-admin');
const { OpenAI } = require('openai');

let firebaseApp;
const RATE_LIMIT = 5; // Max requests per minute per user
const rateLimits = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = rateLimits.get(userId) || [];
  
  // Remove requests older than 1 minute
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
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(context.env.FIREBASE_ADMIN_CREDENTIALS))
      });
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw new Error('Internal server configuration error');
    }
  }
  return admin.firestore();
}

export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight requests
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { text, articleId, user } = await context.request.json();

    // Validate input
    if (!text?.trim() || !articleId || !user?.uid) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check rate limit
    if (!checkRateLimit(user.uid)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Initialize Firebase
    const db = await initializeFirebase(context);

    // Content moderation with OpenAI
    try {
      const openai = new OpenAI({ apiKey: context.env.OPENAI_API_KEY });
      const moderation = await openai.moderations.create({ input: text });
      const result = moderation.results[0];

      if (result.flagged) {
        return new Response(
          JSON.stringify({
            flagged: true,
            categories: result.categories,
            message: 'Content was flagged by moderation'
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

    // Add comment to Firebase with retries
    let retries = 3;
    while (retries > 0) {
      try {
        const commentRef = await db.collection('comments').add({
          content: text.trim(),
          articleId,
          userId: user.uid,
          userName: user.displayName,
          userPhoto: user.photoURL,
          timestamp: new Date(),
          likes: 0,
          likedBy: []
        });

        return new Response(
          JSON.stringify({
            flagged: false,
            message: 'Comment added successfully',
            commentId: commentRef.id
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } catch (error) {
        console.error(`Firebase write error (${retries} retries left):`, error);
        retries--;
        if (retries === 0) {
          throw new Error('Failed to save comment after multiple attempts');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
