/**
 * LOVABLE MIGRATION - Authentication Configuration
 *
 * Authentication setup for Supabase with session management
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ===== SUPABASE CLIENT =====

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// ===== PASSWORD HASHING =====

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ===== JWT TOKEN MANAGEMENT =====

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '7d'; // 7 days

interface JWTPayload {
  userId: string;
  email: string;
  tenantId: string;
  role?: 'sales' | 'portal' | 'admin';
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// ===== SESSION MANAGEMENT =====

export interface Session {
  user: {
    id: string;
    email: string;
    fullName: string;
    tenantId: string;
    role?: string;
  };
  expiresAt: Date;
}

export async function createSession(
  userId: string,
  tenantId: string,
  role: 'sales' | 'portal' = 'sales'
): Promise<{ token: string; session: Session }> {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, tenant_id')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !user) {
    throw new Error('User not found');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const token = generateToken({
    userId: user.id,
    email: user.email,
    tenantId: user.tenant_id,
    role,
  });

  const session: Session = {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      tenantId: user.tenant_id,
      role,
    },
    expiresAt,
  };

  // Store session in database
  await supabaseAdmin.from('sessions').insert({
    user_id: userId,
    tenant_id: tenantId,
    expires_at: expiresAt.toISOString(),
    token,
    role,
  });

  return { token, session };
}

export async function getSession(token: string): Promise<Session | null> {
  const payload = verifyToken(token);
  if (!payload) return null;

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('token', token)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (!session) return null;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, tenant_id')
    .eq('id', payload.userId)
    .single();

  if (!user) return null;

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      tenantId: user.tenant_id,
      role: session.role,
    },
    expiresAt: new Date(session.expires_at),
  };
}

export async function deleteSession(token: string): Promise<void> {
  await supabaseAdmin.from('sessions').delete().eq('token', token);
}

// ===== AUTHENTICATION HELPERS =====

export async function loginUser(
  email: string,
  password: string,
  tenantSlug: string = 'default'
): Promise<{ token: string; session: Session }> {
  // Get tenant
  const { data: tenant } = await supabaseClient
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Get user
  const { data: user } = await supabaseClient
    .from('users')
    .select('id, email, hashed_password, tenant_id, is_active')
    .eq('email', email)
    .eq('tenant_id', tenant.id)
    .single();

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.is_active) {
    throw new Error('Account is inactive');
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.hashed_password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  await supabaseAdmin
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id);

  // Create session
  return createSession(user.id, user.tenant_id, 'sales');
}

export async function registerUser(data: {
  email: string;
  password: string;
  fullName: string;
  tenantSlug: string;
}): Promise<{ token: string; session: Session }> {
  const { email, password, fullName, tenantSlug } = data;

  // Get tenant
  const { data: tenant } = await supabaseClient
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Check if user already exists
  const { data: existingUser } = await supabaseClient
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('tenant_id', tenant.id)
    .single();

  if (existingUser) {
    throw new Error('User already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const { data: newUser, error } = await supabaseAdmin
    .from('users')
    .insert({
      email,
      hashed_password: hashedPassword,
      full_name: fullName,
      tenant_id: tenant.id,
      is_active: true,
    })
    .select('id, tenant_id')
    .single();

  if (error || !newUser) {
    throw new Error('Failed to create user');
  }

  // Create session
  return createSession(newUser.id, newUser.tenant_id);
}

// ===== PERMISSION CHECKS =====

export async function checkPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  // For simplified version, just check if user has sales rep profile
  const { data: salesRep } = await supabaseClient
    .from('sales_reps')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  return !!salesRep;
}

// ===== MIDDLEWARE HELPER =====

export async function withAuth(
  handler: (session: Session) => Promise<Response>
): Promise<Response> {
  try {
    // Get token from cookie or header
    const token = ''; // Extract from request

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }

    const session = await getSession(token);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
      });
    }

    return handler(session);
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Authentication error' }), {
      status: 500,
    });
  }
}
