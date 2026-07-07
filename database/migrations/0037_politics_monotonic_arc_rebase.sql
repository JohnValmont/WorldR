-- 0037: rebase politics arcs onto a monotonic absolute-month scale
--
-- Before this change, getCurrentWorldArc() returned world_clock.current_month
-- (the CALENDAR month, 1-12), so every pol *_arc value was stored on that
-- non-monotonic scale. getCurrentWorldArc() now returns an absolute arc:
--     arc = current_year * 12 + (current_month - 1)
-- Shift existing arc values by the same offset so already-scheduled cycles,
-- terms and AP refreshes stay on schedule after the switch.
--
-- Offset = current_year*12 - 1  (i.e. absolute_arc - current_month).
-- Assumes existing rows were created in the current world year, which holds for
-- the pre-alpha world (year is static). Fresh databases have no rows -> no-op.
BEGIN;

DO $$
DECLARE
    d INTEGER;
BEGIN
    SELECT current_year * 12 - 1 INTO d FROM world_clock LIMIT 1;
    IF d IS NULL THEN
        d := 0;
    END IF;

    UPDATE pol_cycles
       SET start_arc         = start_arc + d,
           polling_arc       = polling_arc + d,
           formation_end_arc = formation_end_arc + d;

    UPDATE pol_parties         SET created_arc  = created_arc + d;
    UPDATE pol_party_members   SET joined_arc   = joined_arc + d;
    UPDATE pol_campaign_actions SET resolved_arc = resolved_arc + d;
    UPDATE pol_offices         SET since_arc    = since_arc + d;
    UPDATE pol_bills           SET proposed_arc = proposed_arc + d;
    UPDATE pol_tenders         SET posted_arc   = posted_arc + d;
    UPDATE pol_tender_bids     SET created_arc  = created_arc + d;
    UPDATE pol_state_policy    SET updated_arc  = updated_arc + d;
    UPDATE pol_ledger_events   SET arc          = arc + d;
    UPDATE pol_character_ap    SET last_regen_arc = last_regen_arc + d;
END $$;

COMMIT;
