//example bot using cloudflare and openai moderation

const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations';
const OPENAI_API_KEY = 'sk-XXXXXXXX';

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${OPENAI_API_KEY}`,
};

addEventListener('fetch', (event) => {
  const { request } = event;
  const { url } = request;

  if (url.endsWith('/event')) {
    return event.respondWith(handleRestEvent(request));
  } else if (url.endsWith('/ws')) {
    return event.respondWith(handleWsEvent(request));
  } else {
    return event.respondWith(handleRoot(request));
  }
});

async function handleRoot(request: Request) {
  if (request.method === 'POST') {
    const formData = await request.formData();
    const content = formData.get('content');
    const result = await moderate(content as string);
    return new Response(renderResult(result), {
      headers: { 'Content-Type': 'text/html' },
    });
  } else {
    return new Response(renderForm(), {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

function renderForm() {
  return `
    <html>
      <head>
        <title>Event Moderation</title>
      </head>
      <body>
        <h1>Submit an Event for Moderation</h1>
        <form method="post">
          <label for="content">Event Content:</label><br>
          <textarea name="content" rows="10" cols="50"></textarea><br><br>
          <input type="submit" value="Submit">
        </form>
      </body>
    </html>
  `;
}

function renderResult(result: any) {
  return `
    <html>
      <head>
        <title>Event Moderation Result</title>
      </head>
      <body>
        <h1>Moderation Result</h1>
        <pre>${JSON.stringify(result, null, 2)}</pre>
        <a href="/">Back to form</a>
      </body>
    </html>
  `;
}

async function handleRestEvent(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await request.text();
  const event = JSON.parse(body);
  const result = await moderate(event.content);
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleWsEvent(request: Request) {
  const { readable, writable } = new TransformStream();
  const ws = new WebSocketPair();
  ws[0].accept();

  ws[0].addEventListener('message', async ({ data }) => {
    const event = JSON.parse(data);
    const result = await moderate(event.content);
    ws[0].send(JSON.stringify(result));
  });

  ws[0].addEventListener('close', (event) => {
    ws[1].close(event.code, event.reason);
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function moderate(content: string) {
  const body = JSON.stringify({ input: content });
  const response = await fetch(OPENAI_MODERATION_URL, {
    method: 'POST',
    headers: headers,
    body: body,
  });

  return await response.json();
}
