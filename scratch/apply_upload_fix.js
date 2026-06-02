const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\achyu\\Desktop\\KL_HIRE_Unified\\src\\app\\admin\\reports\\page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
const normalizedContent = content.replace(/\r\n/g, '\n');

const targetStr = `    // ─── Helper: upload via server-side API (uses service role key) ────────────
    const uploadToSupabase = async (uploadFile: File): Promise<string> => {
      const bucketName = 'interview-recordings';
      const timestamp  = Date.now();
      const fileExt    = uploadFile.name.split('.').pop() || 'mp4';
      const uploadPath = \`admin_uploads/\${candidateId}_\${timestamp}.\${fileExt}\`;

      // ── Debug: Log every upload input ──────────────────────────────────────
      console.log("=== SUPABASE UPLOAD DEBUG ===");
      console.log("Bucket:", bucketName);
      console.log("Upload Path:", uploadPath);
      console.log("File:", uploadFile);
      console.log("File Size (bytes):", uploadFile?.size);
      console.log("File Type:", uploadFile?.type);
      console.log("Candidate ID:", candidateId);

      // Guard: ensure file is non-empty
      if (!uploadFile || uploadFile.size === 0) {
        throw new Error("Upload file is missing or empty (size = 0)");
      }

      // Build FormData for the server API route
      const form = new FormData();
      form.append('file', uploadFile, uploadFile.name);
      form.append('candidateId', candidateId);

      // Track XHR progress while proxying through our server API
      const publicUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload-video", true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setUploadStatusMessage(\`Uploading... \${pct}%\`);
          }
        };

        xhr.onload = () => {
          // ── Debug: Log full response ────────────────────────────────────────
          console.log("=== SERVER UPLOAD RESPONSE ===");
          console.log("Status:", xhr.status);
          console.log("Response:", xhr.responseText);
          console.log("Headers:", xhr.getAllResponseHeaders());

          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              resolve(json.publicUrl);
            } catch {
              reject(new Error("Invalid JSON in upload response: " + xhr.responseText));
            }
          } else {
            reject(new Error(\`\${xhr.status} - \${xhr.responseText}\`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error — upload API unreachable"));
        xhr.send(form);
      });

      return publicUrl;
    };`.replace(/\r\n/g, '\n');

const replacementStr = `    // ─── Helper: upload via direct Supabase signed URL or local fallback ───────
    const uploadToSupabase = async (uploadFile: File): Promise<string> => {
      // Guard: ensure file is non-empty
      if (!uploadFile || uploadFile.size === 0) {
        throw new Error("Upload file is missing or empty (size = 0)");
      }

      console.log("=== UPLOAD INITIALIZING ===");
      console.log("File:", uploadFile.name, "Size:", uploadFile.size, "Type:", uploadFile.type);

      try {
        // Step A: Request signed upload URL or fallback info
        const directUrlRes = await apiFetch(\`/api/upload-video?candidateId=\${candidateId}&filename=\${encodeURIComponent(uploadFile.name)}\`);
        if (!directUrlRes.ok) {
          throw new Error(\`Failed to get upload URL: \${directUrlRes.status}\`);
        }
        const directUrlData = await directUrlRes.json();

        if (directUrlData.success && directUrlData.directUpload) {
          console.log("=== DIRECT SUPABASE UPLOAD ===");
          console.log("Upload URL:", directUrlData.uploadUrl);
          console.log("Public URL:", directUrlData.publicUrl);

          const publicUrl = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", directUrlData.uploadUrl, true);
            xhr.setRequestHeader("Content-Type", uploadFile.type || "video/mp4");

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const pct = Math.round((event.loaded / event.total) * 100);
                setUploadStatusMessage(\`Uploading... \${pct}%\`);
              }
            };

            xhr.onload = () => {
              console.log("=== DIRECT UPLOAD RESPONSE ===");
              console.log("Status:", xhr.status);
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(directUrlData.publicUrl);
              } else {
                reject(new Error(\`Direct upload failed: \${xhr.status} - \${xhr.responseText || 'No response'}\`));
              }
            };

            xhr.onerror = () => reject(new Error("Network error during direct upload to storage"));
            xhr.send(uploadFile);
          });

          return publicUrl;
        } else {
          console.log("=== FALLBACK LOCAL FORM DATA UPLOAD ===");
          // Build FormData for the local fallback server API route
          const form = new FormData();
          form.append('file', uploadFile, uploadFile.name);
          form.append('candidateId', candidateId);

          const publicUrl = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/upload-video", true);

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const pct = Math.round((event.loaded / event.total) * 100);
                setUploadStatusMessage(\`Uploading... \${pct}%\`);
              }
            };

            xhr.onload = () => {
              console.log("=== FALLBACK UPLOAD RESPONSE ===");
              console.log("Status:", xhr.status);
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const json = JSON.parse(xhr.responseText);
                  resolve(json.publicUrl);
                } catch {
                  reject(new Error("Invalid JSON in fallback upload response: " + xhr.responseText));
                }
              } else {
                reject(new Error(\`Fallback upload failed: \${xhr.status} - \${xhr.responseText}\`));
              }
            };

            xhr.onerror = () => reject(new Error("Network error — local fallback upload API unreachable"));
            xhr.send(form);
          });

          return publicUrl;
        }
      } catch (err) {
        console.error("uploadToSupabase error:", err);
        throw err;
      }
    };`.replace(/\r\n/g, '\n');

if (!normalizedContent.includes(targetStr.trim())) {
  console.error("Target string not found in normalized content!");
  process.exit(1);
}

const updatedContent = normalizedContent.replace(targetStr, replacementStr);
fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log("Successfully replaced uploadToSupabase in page.tsx!");
