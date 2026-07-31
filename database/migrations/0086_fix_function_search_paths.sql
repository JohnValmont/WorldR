-- Fix for Supabase Security Advisor "Function Search Path Mutable" warnings
-- This explicitly sets the search_path to 'public' for functions that lacked it.

ALTER FUNCTION generate_user_id() SET search_path = public;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_pol_scandals_updated_at') THEN
        ALTER FUNCTION update_pol_scandals_updated_at() SET search_path = public;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_pol_campaigns_updated_at') THEN
        ALTER FUNCTION update_pol_campaigns_updated_at() SET search_path = public;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_pol_igr_updated_at') THEN
        ALTER FUNCTION update_pol_igr_updated_at() SET search_path = public;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_pol_media_rel_updated_at') THEN
        ALTER FUNCTION update_pol_media_rel_updated_at() SET search_path = public;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_pol_legacy_scores_updated_at') THEN
        ALTER FUNCTION update_pol_legacy_scores_updated_at() SET search_path = public;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_pol_petitions_updated_at') THEN
        ALTER FUNCTION update_pol_petitions_updated_at() SET search_path = public;
    END IF;
END $$;
