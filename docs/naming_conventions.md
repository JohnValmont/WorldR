# Naming Conventions

## Database
snake_case

Examples:
nation_id
population_group_id
law_effect_id

## APIs
/api/v1/nations/:nation_id

## Frontend
PascalCase for components.
camelCase for variables.

## Parameters
parameter_category.parameter_name

Example:
inflation.food_weight
economy.base_growth_rate

## Tables
Plural snake_case.

Examples:
nations
population_groups
economic_sectors

## IDs
All entities use UUIDs.

## Dates
ISO 8601 format.

## Historical data
Use snapshot tables instead of overwriting historical values.
