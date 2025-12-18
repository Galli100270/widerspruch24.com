import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import convert from 'npm:heic-convert@1.2.3';
import { Buffer } from "node:buffer";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { file_uri, quality = 85 } = await req.json();

    if (!file_uri) {
      return Response.json({ error: 'file_uri is required' }, { status: 400 });
    }

    // KORREKTUR: Integration über 'invoke' aufrufen
    const signedUrlResponse = await base44.asServiceRole.integrations.invoke('CreateFileSignedUrl', {
      file_uri: file_uri,
      expires_in: 60, // URL is valid for 60 seconds
    });

    if (!signedUrlResponse.signed_url) {
      throw new Error('Failed to create signed URL for the HEIC file.');
    }

    // Fetch the file content from the signed URL
    const imageResponse = await fetch(signedUrlResponse.signed_url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch HEIC file: ${imageResponse.statusText}`);
    }
    const inputBuffer = await imageResponse.arrayBuffer();

    // Convert HEIC buffer to JPEG buffer
    const outputBuffer = await convert({
      buffer: Buffer.from(inputBuffer),
      format: 'JPEG',
      quality: quality / 100,
    });

    // Return the converted JPEG file as a response
    return new Response(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });

  } catch (error) {
    console.error('HEIC conversion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});