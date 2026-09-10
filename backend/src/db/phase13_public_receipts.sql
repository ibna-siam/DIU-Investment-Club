-- ====================================================
-- PHASE 13 — PUBLIC DIGITAL RECEIPTS MIGRATION
-- DIU Investment Club Financial Management System
-- ====================================================

-- 1. Add cryptographic public receipt token column to member_payments
ALTER TABLE public.member_payments 
ADD COLUMN IF NOT EXISTS receipt_token TEXT UNIQUE;

-- 2. Index for fast O(1) unauthenticated public receipt lookups
CREATE INDEX IF NOT EXISTS idx_member_payments_receipt_token 
ON public.member_payments(receipt_token);

-- 3. Backfill existing VERIFIED payments with secure 64-char hex tokens
UPDATE public.member_payments 
SET receipt_token = encode(gen_random_bytes(32), 'hex') 
WHERE receipt_token IS NULL AND status = 'VERIFIED';
