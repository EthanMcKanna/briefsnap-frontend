export async function onRequest({ params, request }) {
    const path = params.path ? params.path.join('/') : '';
    const url = `https://briefsnap-76b64.firebaseapp.com/__/auth/${path}`;
    
    return fetch(url, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });
  }