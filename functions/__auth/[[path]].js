export async function onRequest({ params, request }) {
    const path = params.path ? params.path.join('/') : '';
    const url = `https://briefsnap-76b64.firebaseapp.com/__/auth/${path}${request.url.includes('?') ? request.url.substring(request.url.indexOf('?')) : ''}`;
    
    console.log('Proxying request to:', url);
    
    return fetch(url, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' ? request.body : undefined
    });
  }