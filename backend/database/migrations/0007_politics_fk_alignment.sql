-- UP
BEGIN;

ALTER TABLE pol_parties 
    ADD CONSTRAINT fk_pol_parties_leader FOREIGN KEY (leader_character_id) REFERENCES characters(id) ON DELETE SET NULL;

ALTER TABLE pol_party_members 
    ADD CONSTRAINT fk_pol_party_members_char FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE;

ALTER TABLE pol_candidates 
    ADD CONSTRAINT fk_pol_candidates_char FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE;

ALTER TABLE pol_council_seats 
    ADD CONSTRAINT fk_pol_council_seats_char FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE;

ALTER TABLE pol_offices 
    ADD CONSTRAINT fk_pol_offices_holder FOREIGN KEY (holder_character_id) REFERENCES characters(id) ON DELETE SET NULL;

ALTER TABLE pol_bill_votes 
    ADD CONSTRAINT fk_pol_bill_votes_char FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE;

ALTER TABLE pol_tenders 
    ADD CONSTRAINT fk_pol_tenders_company FOREIGN KEY (awarded_company_id) REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE pol_tender_bids 
    ADD CONSTRAINT fk_pol_tender_bids_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_pol_tender_bids_model FOREIGN KEY (model_id) REFERENCES manufacturing_vehicle_models(id) ON DELETE CASCADE;

COMMIT;

-- DOWN
BEGIN;

ALTER TABLE pol_tender_bids 
    DROP CONSTRAINT IF EXISTS fk_pol_tender_bids_model,
    DROP CONSTRAINT IF EXISTS fk_pol_tender_bids_company;

ALTER TABLE pol_tenders 
    DROP CONSTRAINT IF EXISTS fk_pol_tenders_company;

ALTER TABLE pol_bill_votes 
    DROP CONSTRAINT IF EXISTS fk_pol_bill_votes_char;

ALTER TABLE pol_offices 
    DROP CONSTRAINT IF EXISTS fk_pol_offices_holder;

ALTER TABLE pol_council_seats 
    DROP CONSTRAINT IF EXISTS fk_pol_council_seats_char;

ALTER TABLE pol_candidates 
    DROP CONSTRAINT IF EXISTS fk_pol_candidates_char;

ALTER TABLE pol_party_members 
    DROP CONSTRAINT IF EXISTS fk_pol_party_members_char;

ALTER TABLE pol_parties 
    DROP CONSTRAINT IF EXISTS fk_pol_parties_leader;

COMMIT;
