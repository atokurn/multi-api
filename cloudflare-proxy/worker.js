/**
 * Cloudflare Worker Proxy for DramaBox API
 * 
 * This worker forwards requests to DramaBox API using Cloudflare's IP addresses
 * which are not blocked by the DramaBox server.
 * 
 * Usage:
 * POST https://your-worker.workers.dev/
 * Body: { endpoint, method, body, headers, timestamp }
 */

const DRAMABOX_BASE_URL = 'https://sapi.dramaboxdb.com';

// CORS headers untuk allow request dari Vercel
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
};

export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // Parse incoming request
            const requestData = await request.json();
            const { endpoint, method = 'POST', body = {}, headers = {}, timestamp } = requestData;

            if (!endpoint) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Missing endpoint parameter'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Build URL with timestamp
            const ts = timestamp || Date.now().toString();
            const url = `${DRAMABOX_BASE_URL}${endpoint}?timestamp=${ts}`;

            console.log(`[CF-Proxy] ${method} ${url}`);

            // Build request headers - pass through all headers from client
            // Remove headers that shouldn't be forwarded
            const forwardHeaders = { ...headers };
            delete forwardHeaders['host'];
            delete forwardHeaders['Host'];

            // Ensure Host header is set correctly
            forwardHeaders['Host'] = 'sapi.dramaboxdb.com';

            // Forward request to DramaBox
            const fetchOptions = {
                method: method,
                headers: forwardHeaders
            };

            // Add body for POST requests
            if (method === 'POST') {
                fetchOptions.body = JSON.stringify(body);
            }

            console.log('[CF-Proxy] Request headers:', JSON.stringify(Object.keys(forwardHeaders)));

            const response = await fetch(url, fetchOptions);

            // Get response
            const contentType = response.headers.get('content-type');
            const responseText = await response.text();

            console.log(`[CF-Proxy] Response status: ${response.status}, content-type: ${contentType}`);

            // Check if response is HTML (error page)
            if (!contentType?.includes('application/json') && responseText.startsWith('<')) {
                console.error('[CF-Proxy] Got HTML response:', responseText.substring(0, 200));
                return new Response(JSON.stringify({
                    success: false,
                    error: 'DramaBox returned HTML error page',
                    status: response.status,
                    preview: responseText.substring(0, 300)
                }), {
                    status: 502,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Parse and return JSON response
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid JSON from DramaBox',
                    raw: responseText.substring(0, 500)
                }), {
                    status: 502,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify({
                success: true,
                data: data
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('[CF-Proxy] Error:', error.message, error.stack);
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};
