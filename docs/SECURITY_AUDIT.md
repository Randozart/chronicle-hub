# Security Audit — ChronicleHub
**Date:** 2026-03-15
**Scope:** API routes, auth (NextAuth), file uploads, MongoDB, admin access

## Summary

The ChronicleHub application demonstrates generally good security practices with proper authentication checks on most API routes, secure password handling with bcrypt, and environment-based configuration. However, several areas require attention including open CORS headers, missing rate limiting on auth endpoints, vulnerable dependencies, and potential file upload issues.

## Critical (fix before production)

1. **Open CORS Policy** (`C:\Chronicle Hub\chronicle-hub\src\app\api\strudel-samples\route.ts:10`)
   - The `/api/strudel-samples` endpoint has `Access-Control-Allow-Origin: '*'` allowing any website to make requests
   - This could enable cross-site request forgery (CSRF) and information leakage
   - **Recommendation:** Restrict to specific origins or remove CORS headers if not needed for public API

2. **Vulnerable Dependencies**
   - `fast-xml-parser` (critical severity): XML entity expansion DoS and regex injection (CVE-2024-xxxx)
   - `@aws-sdk/xml-builder` (critical): Inherits fast-xml-parser vulnerabilities
   - `ajv` (moderate): ReDoS vulnerability with `$data` option
   - **Recommendation:** Update dependencies: `npm audit fix --force`

## High

3. **Missing Rate Limiting on Auth Endpoints**
   - Password reset endpoint (`/api/auth/forgot-password`) has no rate limiting
   - Login endpoint via NextAuth has no rate limiting
   - **Risk:** Brute force attacks and email bombing
   - **Location:** `C:\Chronicle Hub\chronicle-hub\src\app\api\auth\forgot-password\route.ts`
   - **Recommendation:** Implement rate limiting middleware or use a service like Upstash Ratelimit

4. **S3 Objects with Public Read ACL** (`C:\Chronicle Hub\chronicle-hub\src\engine\storageService.ts:124`)
   - File uploads to S3 use `ACL: 'public-read'` making all uploaded files publicly accessible
   - **Risk:** Sensitive user uploads could be accessed without authentication
   - **Recommendation:** Use private ACL and generate signed URLs for access, or implement proper access controls

## Medium

5. **Admin Route Access Control Inconsistency**
   - Some admin routes check for admin role via `verifyWorldAccess` function
   - Others only check authentication without verifying admin privileges
   - **Example:** `/api/admin/config/route.ts` uses `verifyWorldAccess` but doesn't explicitly check for admin role
   - **Recommendation:** Standardize admin authorization checks across all admin routes

6. **File Upload Validation Gaps**
   - Upload route validates file types but doesn't check for malicious content
   - No virus/malware scanning of uploaded files
   - **Location:** `C:\Chronicle Hub\chronicle-hub\src\app\api\admin\assets\upload\route.ts:35-38`
   - **Recommendation:** Implement file content validation and consider malware scanning for user uploads

7. **Path Traversal Prevention Basic**
   - File upload sanitizes `../` but uses simple regex replacement
   - **Location:** `C:\Chronicle Hub\chronicle-hub\src\app\api\admin\assets\upload\route.ts:24`
   - **Recommendation:** Use more robust path normalization library

## Low / Informational

8. **Environment File Contains Secrets**
   - `.env.local` file contains SMTP credentials and NextAuth secret
   - While this is development practice, ensure it's not committed to git (checked: `.gitignore` includes `.env.local`)
   - **Location:** `C:\Chronicle Hub\chronicle-hub\.env.local`

9. **No Input Validation/Sanitization for MongoDB Queries**
   - Most queries use parameterized queries (good practice)
   - However, no schema validation or input sanitization beyond basic checks
   - **Recommendation:** Implement Zod schema validation for all API inputs

10. **Session Management**
    - JWT sessions with 30-day default (NextAuth default)
    - No explicit session timeout configuration
    - **Recommendation:** Consider shorter session durations for sensitive operations

## Positive findings

1. **Authentication Implemented Correctly**
   - NextAuth with bcrypt password hashing
   - Proper session validation using `getServerSession()` on protected routes
   - Email verification and password reset flows

2. **Authorization Layer Present**
   - `verifyWorldAccess` function provides role-based access control
   - Checks for admin, owner, and collaborator roles
   - World-specific permission system

3. **Secure Password Requirements**
   - Password validation requires 8+ chars with uppercase, lowercase, numbers, and special characters
   - **Location:** `C:\Chronicle Hub\chronicle-hub\src\utils\validation.ts`

4. **Environment Variables Externalized**
   - All secrets (MongoDB, S3, SMTP, NextAuth) in environment variables
   - No hardcoded credentials found in source code

5. **File Type Validation**
   - Upload endpoints validate MIME types and file extensions
   - Image optimization with Sharp library

6. **Docker Hardening**
   - Container runs with `--read-only --cap-drop=ALL --security-opt no-new-privileges=true`
   - Good infrastructure security posture

## Immediate Actions Required

1. **Critical:** Fix CORS policy on `/api/strudel-samples`
2. **Critical:** Update vulnerable dependencies (`npm audit fix`)
3. **High:** Implement rate limiting on auth endpoints
4. **High:** Change S3 ACL from `public-read` to private with signed URLs
5. **Medium:** Standardize admin authorization checks
6. **Medium:** Enhance file upload security with content validation