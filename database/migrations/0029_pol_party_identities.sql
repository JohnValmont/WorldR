-- UP
BEGIN;

CREATE TABLE pol_party_identities (
    party_id UUID PRIMARY KEY REFERENCES pol_parties(id) ON DELETE CASCADE,
    color VARCHAR(20) NOT NULL,
    monogram VARCHAR(5) NOT NULL,
    leader VARCHAR(100) NOT NULL,
    motto VARCHAR(255) NOT NULL,
    blurb VARCHAR(255) NOT NULL
);

COMMIT;

