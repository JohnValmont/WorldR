-- WORLDr Database Migration: Lower component prices by 100x

UPDATE manufacturing_component_catalogue SET base_cost = base_cost / 100.0;
