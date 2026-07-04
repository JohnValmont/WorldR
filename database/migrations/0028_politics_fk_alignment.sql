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

