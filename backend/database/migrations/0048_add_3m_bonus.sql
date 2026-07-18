-- Give existing players 3M bonus in cash and net worth
UPDATE character_finances 
SET cash_in_hand = cash_in_hand + 3000000, 
    net_worth = net_worth + 3000000;
