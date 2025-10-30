import { Hono } from "npm:hono@4";
import { cors } from "npm:hono@4/cors";
import { logger } from "npm:hono@4/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Storage bucket name for videos
const VIDEO_BUCKET = 'make-b26bdf05-videos';

// Function to ensure bucket exists
async function ensureBucketExists() {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === VIDEO_BUCKET);
    
    if (!bucketExists) {
      console.log(`Creating storage bucket: ${VIDEO_BUCKET}...`);
      const { data, error: createError } = await supabase.storage.createBucket(VIDEO_BUCKET, {
        public: false,
      });
      
      if (createError) {
        // If bucket already exists (409), treat as success
        if (createError.statusCode === '409' || createError.message?.includes('already exists')) {
          console.log(`✓ Storage bucket already exists: ${VIDEO_BUCKET}`);
          return true;
        }
        console.error('Error creating bucket:', createError);
        throw createError;
      }
      
      console.log(`✓ Created storage bucket: ${VIDEO_BUCKET}`);
    } else {
      console.log(`✓ Storage bucket exists: ${VIDEO_BUCKET}`);
    }
    
    return true;
  } catch (error) {
    // Even if there's an error, check if it's because bucket already exists
    if (error.statusCode === '409' || error.message?.includes('already exists')) {
      console.log(`✓ Storage bucket already exists (from catch): ${VIDEO_BUCKET}`);
      return true;
    }
    console.error('Error ensuring bucket exists:', error);
    return false;
  }
}

// Initialize storage bucket on startup
ensureBucketExists();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-b26bdf05/health", async (c) => {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === VIDEO_BUCKET);
    
    return c.json({ 
      status: "ok",
      storage: bucketExists ? "ready" : "initializing",
      bucket: VIDEO_BUCKET,
    });
  } catch (error) {
    return c.json({ 
      status: "ok",
      storage: "error",
      error: error.message 
    });
  }
});

// Sign up endpoint
app.post("/make-server-b26bdf05/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, role, age, gender, state } = body;

    if (!email || !password || !name || !role) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      email_confirm: true, // Auto-confirm since email server isn't configured
    });

    if (authError) {
      console.log("Auth error during signup:", authError);
      return c.json({ error: authError.message }, 400);
    }

    // Store additional profile data in KV store
    const userId = authData.user.id;
    const profileKey = `profile:${userId}`;
    
    await kv.set(profileKey, {
      id: userId,
      email,
      name,
      role,
      age,
      gender,
      state,
      createdAt: new Date().toISOString(),
      testsCompleted: 0,
      performanceScore: 0,
    });

    return c.json({ 
      user: { 
        id: userId, 
        email, 
        name, 
        role 
      } 
    });
  } catch (error) {
    console.log("Signup error:", error);
    return c.json({ error: "Signup failed: " + error.message }, 500);
  }
});

// Sign in endpoint
app.post("/make-server-b26bdf05/signin", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: "Missing email or password" }, 400);
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log("Auth error during signin:", error);
      return c.json({ error: error.message }, 401);
    }

    // Get profile data
    const profileKey = `profile:${data.user.id}`;
    const profile = await kv.get(profileKey);

    return c.json({ 
      user: profile || { 
        id: data.user.id, 
        email: data.user.email, 
        name: data.user.user_metadata?.name || email.split('@')[0],
        role: data.user.user_metadata?.role || 'athlete'
      },
      accessToken: data.session.access_token
    });
  } catch (error) {
    console.log("Signin error:", error);
    return c.json({ error: "Signin failed: " + error.message }, 500);
  }
});

// Upload video
app.post("/make-server-b26bdf05/upload-video", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { videoBase64, testType, timestamp } = body;

    if (!videoBase64 || !testType) {
      return c.json({ error: "Missing video data or test type" }, 400);
    }

    // Ensure bucket exists before upload
    const bucketReady = await ensureBucketExists();
    if (!bucketReady) {
      return c.json({ error: "Storage not available. Please try again." }, 500);
    }

    // Convert base64 to blob
    const videoBuffer = Uint8Array.from(atob(videoBase64.split(',')[1] || videoBase64), c => c.charCodeAt(0));
    
    // Generate unique filename
    const fileName = `${user.id}/${testType}_${timestamp}.webm`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(fileName, videoBuffer, {
        contentType: 'video/webm',
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return c.json({ error: "Failed to upload video: " + uploadError.message }, 500);
    }

    // Generate signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(VIDEO_BUCKET)
      .createSignedUrl(fileName, 3600);

    if (urlError) {
      console.log("URL generation error:", urlError);
    }

    return c.json({ 
      success: true, 
      videoPath: fileName,
      videoUrl: urlData?.signedUrl,
    });
  } catch (error) {
    console.log("Error uploading video:", error);
    return c.json({ error: "Failed to upload video: " + error.message }, 500);
  }
});

// Save test result (with optional video path)
app.post("/make-server-b26bdf05/test-results", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { testType, score, metrics, timestamp, videoPath, aiAnalysis } = body;

    // Store test result
    const testResultKey = `test:${user.id}:${testType}:${timestamp}`;
    await kv.set(testResultKey, {
      userId: user.id,
      testType,
      score,
      metrics,
      timestamp,
      verified: true,
      videoPath: videoPath || null,
      aiAnalysis: aiAnalysis || null,
    });

    // Update profile statistics
    const profileKey = `profile:${user.id}`;
    const profile = await kv.get(profileKey);
    
    if (profile) {
      // Get all test results for this user
      const allTests = await kv.getByPrefix(`test:${user.id}:`);
      const testTypes = new Set(allTests.map((t: any) => t.testType));
      const avgScore = allTests.reduce((sum: number, t: any) => sum + t.score, 0) / allTests.length;
      
      profile.testsCompleted = testTypes.size;
      profile.performanceScore = Math.round(avgScore);
      
      await kv.set(profileKey, profile);
    }

    return c.json({ success: true, testResultKey });
  } catch (error) {
    console.log("Error saving test result:", error);
    return c.json({ error: "Failed to save test result: " + error.message }, 500);
  }
});

// Get athlete profile and test history
app.get("/make-server-b26bdf05/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profileKey = `profile:${user.id}`;
    const profile = await kv.get(profileKey);
    
    // Get all test results
    const testResults = await kv.getByPrefix(`test:${user.id}:`);
    
    return c.json({ 
      profile: profile || { id: user.id, email: user.email },
      testResults: testResults || []
    });
  } catch (error) {
    console.log("Error fetching profile:", error);
    return c.json({ error: "Failed to fetch profile: " + error.message }, 500);
  }
});

// Update athlete profile
app.post("/make-server-b26bdf05/update-profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { profileKey, profile } = body;

    // Verify the profile key matches the user
    if (profileKey !== `profile:${user.id}`) {
      return c.json({ error: "Forbidden: Cannot update other user's profile" }, 403);
    }

    // Update profile
    await kv.set(profileKey, profile);

    return c.json({ success: true, profile });
  } catch (error) {
    console.log("Error updating profile:", error);
    return c.json({ error: "Failed to update profile: " + error.message }, 500);
  }
});

// Get all athletes (for officials)
app.get("/make-server-b26bdf05/athletes", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Check if user is an official
    const profileKey = `profile:${user.id}`;
    const profile = await kv.get(profileKey);
    
    if (!profile || profile.role !== 'official') {
      return c.json({ error: "Forbidden: Officials only" }, 403);
    }

    // Get all profiles
    const allProfiles = await kv.getByPrefix('profile:');
    const athletes = allProfiles.filter((p: any) => p.role === 'athlete');
    
    return c.json({ athletes });
  } catch (error) {
    console.log("Error fetching athletes:", error);
    return c.json({ error: "Failed to fetch athletes: " + error.message }, 500);
  }
});

// Get statistics (for officials)
app.get("/make-server-b26bdf05/statistics", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get all profiles and test results
    const allProfiles = await kv.getByPrefix('profile:');
    const allTests = await kv.getByPrefix('test:');
    
    const athletes = allProfiles.filter((p: any) => p.role === 'athlete');
    const totalAthletes = athletes.length;
    const testsCompleted = allTests.length;
    const avgScore = athletes.reduce((sum: number, a: any) => sum + (a.performanceScore || 0), 0) / totalAthletes || 0;
    
    // Calculate state distribution
    const stateData: any = {};
    athletes.forEach((athlete: any) => {
      const state = athlete.state || 'Unknown';
      if (!stateData[state]) {
        stateData[state] = { state, athletes: 0, scores: [] };
      }
      stateData[state].athletes++;
      if (athlete.performanceScore) {
        stateData[state].scores.push(athlete.performanceScore);
      }
    });
    
    const stateStats = Object.values(stateData).map((s: any) => ({
      state: s.state,
      athletes: s.athletes,
      avgScore: s.scores.length > 0 ? Math.round(s.scores.reduce((a: number, b: number) => a + b, 0) / s.scores.length) : 0,
    }));
    
    return c.json({ 
      totalAthletes,
      testsCompleted,
      avgScore: Math.round(avgScore),
      pendingVerification: 0,
      stateData: stateStats,
    });
  } catch (error) {
    console.log("Error fetching statistics:", error);
    return c.json({ error: "Failed to fetch statistics: " + error.message }, 500);
  }
});

Deno.serve(app.fetch);