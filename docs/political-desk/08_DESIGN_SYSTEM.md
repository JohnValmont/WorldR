08_DESIGN_SYSTEM.md ? Complete design system (buttons, cards, tables, typography, colors, spacing, icons, dialogs, forms, etc.)

# 08_DESIGN_SYSTEM.md

# Part 1 of 12 — Design Philosophy & Foundations

**Project:** WORLDr

**Module:** Political Domain

**Version:** Pre-Alpha v0.1

**Status:** Foundation Specification

---

# 1. Purpose

This document defines the visual language, reusable interface components, interaction consistency, and design standards for the Political Domain.

The Design System ensures every screen, module, and component follows a unified visual identity and interaction model.

Rather than designing individual interfaces independently, every screen within the Political Domain shall be assembled from standardized components defined in this document.

The Design System serves as the single source of truth for frontend development.

---

# 2. Objectives

The Design System has five primary objectives.

• Maintain visual consistency.

• Improve development efficiency.

• Simplify future expansion.

• Reduce design duplication.

• Create a professional user experience.

Every component should solve a recurring interface problem instead of being designed for a single screen.

---

# 3. Design Philosophy

The Political Domain is designed as a professional political management application rather than a traditional game interface.

Visual design should communicate clarity, authority, and trust.

The interface should support long decision-making sessions without causing visual fatigue.

Decoration should never reduce readability or usability.

The interface should remain timeless rather than following short-term design trends.

---

# 4. Core Design Principles

Every component shall follow these principles.

## Clarity

Information should be immediately understandable.

Visual hierarchy must guide attention naturally.

Ambiguity should be avoided.

---

## Consistency

Components performing the same function shall always appear and behave identically.

Users should never relearn interactions between modules.

---

## Simplicity

Interfaces should expose only the information required for the current task.

Additional information should be progressively disclosed.

---

## Scalability

Every component shall support future expansion without requiring redesign.

New modules should reuse existing components whenever possible.

---

## Accessibility

Accessibility is considered a core requirement.

Every component must remain usable with keyboard navigation, assistive technologies, and accessibility preferences.

---

# 5. Design Language

The Political Domain adopts a modern desktop application aesthetic.

Visual inspiration includes professional productivity software rather than entertainment-focused interfaces.

Characteristics include:

• Clean layouts

• Consistent spacing

• Strong typography

• Clear visual hierarchy

• Moderate use of color

• Meaningful icons

• Minimal decorative elements

• High information density without clutter

---

# 6. Design Hierarchy

Every interface follows the same visual hierarchy.

Application

↓

Domain

↓

Module

↓

Screen

↓

Section

↓

Component

↓

Element

Each level has a clearly defined purpose.

Lower levels should never duplicate responsibilities of higher levels.

---

# 7. Component Philosophy

Every reusable interface element is considered a Component.

Examples include:

• Button

• Card

• Badge

• Dialog

• Table

• Input Field

• Dropdown

• Navigation Item

• Notification

• Tooltip

Components should be generic.

Business logic belongs to modules, not components.

Components should remain reusable across multiple screens.

---

# 8. Component States

Every interactive component shall define standardized states.

Minimum supported states include:

• Default

• Hover

• Focus

• Active

• Disabled

• Loading

• Selected (where applicable)

Additional states may be introduced when required.

State transitions should remain visually consistent across all components.

---

# 9. Reusability Standards

Components shall never be duplicated with minor visual differences.

If multiple screens require similar functionality, the existing component should be extended rather than recreated.

Variation should be achieved through properties rather than separate implementations.

Examples:

Primary Button

Secondary Button

Danger Button

are variants of the same Button component.

---

# 10. Design Consistency Rules

The following rules apply throughout the Political Domain.

• One purpose per component.

• One interaction pattern per action.

• One visual style per component type.

• One terminology system throughout the application.

Consistency is preferred over novelty.

---

# 11. Naming Standards

Component names should describe their purpose rather than their appearance.

Preferred:

Button

Party Card

Government Card

Notification

Timeline

Status Badge

Avoid names based on color or position.

Examples to avoid:

Blue Button

Left Card

Big Table

Naming should remain meaningful even if the visual design changes.

---

# 12. Future Compatibility

The Design System is intended to serve every future Political Domain module.

Future gameplay systems should extend this Design System instead of creating independent visual languages.

Long-term consistency is a fundamental design objective.

---

# End of Part 1

# 08_DESIGN_SYSTEM.md

# Part 2 of 12 — Color System

**Project:** WORLDr

**Module:** Political Domain

**Version:** Pre-Alpha v0.1

---

# 1. Purpose

This section defines the color system for the Political Domain.

Colors are used to establish hierarchy, communicate meaning, improve readability, and provide consistent visual feedback.

The Design System shall use semantic color tokens instead of hardcoded colors whenever possible.

Components reference semantic tokens rather than specific color values.

This approach improves maintainability, enables future themes, and reduces implementation complexity.

---

# 2. Design Principles

The color system shall follow these principles.

• Prioritize readability.

• Use color to communicate meaning rather than decoration.

• Maintain sufficient contrast for accessibility.

• Limit the number of simultaneous accent colors.

• Avoid relying solely on color to convey information.

---

# 3. Color Categories

The Political Domain defines the following color categories.

## Primary

Represents the application's primary identity.

Used for:

• Primary buttons

• Active navigation

• Primary links

• Focus indicators

• Important actions

---

## Secondary

Used for supporting interface elements.

Examples include:

• Secondary buttons

• Supporting icons

• Less prominent actions

• Neutral highlights

---

## Neutral

Used for interface structure.

Examples include:

• Backgrounds

• Borders

• Dividers

• Panels

• Cards

• Disabled components

Neutral colors should represent the majority of the interface.

---

## Semantic

Semantic colors communicate application state.

They should never represent branding.

Semantic categories include:

• Success

• Warning

• Error

• Information

---

# 4. Design Tokens

The Design System shall define reusable semantic tokens.

Examples include:

Primary

Primary Hover

Primary Active

Secondary

Surface

Surface Elevated

Background

Border

Text Primary

Text Secondary

Text Disabled

Success

Warning

Error

Information

Focus Ring

Disabled

These names shall remain constant even if visual colors change.

---

# 5. Surface Hierarchy

Different interface layers should remain visually distinguishable.

Surface hierarchy shall include:

Application Background

↓

Module Background

↓

Panel Surface

↓

Card Surface

↓

Modal Surface

↓

Tooltip Surface

Higher layers should appear progressively elevated while remaining visually subtle.

---

# 6. Text Colors

Text colors should establish a clear reading hierarchy.

Three primary text levels shall be used.

Primary Text

Used for:

• Headings

• Important information

• Labels

---

Secondary Text

Used for:

• Supporting information

• Metadata

• Descriptions

---

Disabled Text

Used only when interaction is unavailable.

Disabled text should remain readable while clearly communicating inactivity.

---

# 7. Border Colors

Borders should separate information rather than attract attention.

Border categories include:

Subtle Border

Standard Border

Strong Border

Focus Border

Error Border

Borders should never dominate the interface.

---

# 8. Interactive Colors

Interactive components shall define consistent color behavior.

Minimum supported states:

Default

Hover

Focus

Pressed

Selected

Disabled

Loading

The transition between states should remain smooth and predictable.

---

# 9. Status Colors

Status colors communicate application state.

## Success

Examples:

• Saved successfully

• Bill approved

• Action completed

---

## Warning

Examples:

• Pending deadline

• Unsaved changes

• Attention required

---

## Error

Examples:

• Validation failed

• Server error

• Action denied

---

## Information

Examples:

• New notification

• System message

• General update

Status colors shall always be accompanied by descriptive text or icons.

---

# 10. Political Status Colors

Certain colors represent political concepts.

These colors should remain consistent throughout the Political Domain.

Examples include:

Government

Opposition

Independent

Coalition

Majority

Minority

Election

Legislation

Political Party

The exact visual values may evolve, but the semantic meaning must remain stable.

---

# 11. Data Visualization Colors

Charts and analytical components require additional color rules.

Requirements include:

• Distinguishable series.

• Consistent category mapping.

• Colorblind-friendly palettes.

• Meaningful legends.

Charts should remain understandable when printed in grayscale whenever practical.

---

# 12. Accessibility

Color usage shall satisfy accessibility requirements.

Requirements include:

• Sufficient contrast ratios.

• Visible focus indicators.

• Non-color visual cues.

• Readable text on all backgrounds.

Color should never be the sole indicator of status or importance.

---

# 13. Dark Mode

The Political Domain is optimized primarily for Dark Mode.

Dark Mode should be treated as the default visual experience.

Light Mode may be introduced in future versions using the same semantic token system.

All semantic color names shall remain identical across themes.

---

# 14. Future Compatibility

Future themes should modify only design token values.

Component implementations should remain unchanged.

This separation allows visual redesigns without affecting application logic or component behavior.

---

# End of Part 2

One recommendation before Part 3

I would not put actual HEX values in this document.

Instead, create them later in your frontend as something like:

Primary-50
Primary-100
Primary-200
...
Primary-900

Neutral-50
...
Neutral-900

Success-500

Warning-500

Error-500

Then reference tokens everywhere.

For example:

Button Background → Primary-600
Button Hover → Primary-700
Card Background → Surface
Border → Border
Error Message → Error-600

This is how modern design systems (Material Design 3, Atlassian, GitHub Primer, Polaris, etc.) stay maintainable. It also makes changing the game's visual identity later a matter of updating token values instead of editing hundreds of components.

# 08_DESIGN_SYSTEM.md

# Part 3 of 12 — Typography System

**Project:** WORLDr

**Module:** Political Domain

**Version:** Pre-Alpha v0.1

---

# 1. Purpose

Typography establishes the visual hierarchy of the Political Domain.

It communicates importance, improves readability, and creates a consistent reading experience across every screen.

The typography system shall use semantic text styles rather than hardcoded font sizes or weights.

Components reference text roles instead of individual font properties.

---

# 2. Typography Principles

The typography system follows these principles.

• Prioritize readability.

• Maintain a clear visual hierarchy.

• Minimize unnecessary variation.

• Support long reading sessions.

• Scale consistently across the application.

---

# 3. Font Families

The Design System defines three font roles.

## Primary Font

Used for:

- Interface text
- Navigation
- Forms
- Buttons
- Tables
- Dialogs
- Cards

This font should prioritize readability and UI clarity.

---

## Display Font

Used sparingly for:

- Major headings
- Landing pages
- Promotional content

Display fonts should never reduce readability.

---

## Monospace Font

Used for:

- IDs
- Debug information
- Logs
- Code samples
- Technical values

Monospace fonts should not be used for normal interface text.

---

# 4. Typography Hierarchy

The application shall use the following text roles.

Display

↓

Heading 1

↓

Heading 2

↓

Heading 3

↓

Heading 4

↓

Body Large

↓

Body

↓

Body Small

↓

Caption

↓

Label

↓

Code

Each role has a unique purpose.

---

# 5. Display

Purpose:

Highest-level visual emphasis.

Examples:

- Landing pages
- Major application titles

Display text should be used sparingly.

---

# 6. Headings

Headings organize information.

## Heading 1

Used for:

- Screen titles
- Primary pages

---

## Heading 2

Used for:

- Major sections

---

## Heading 3

Used for:

- Subsections

---

## Heading 4

Used for:

- Component groups
- Cards
- Dialog titles

Heading levels should never be skipped.

---

# 7. Body Text

Body text communicates most application information.

## Body Large

Used for:

- Important descriptions
- Introductory content

---

## Body

Default reading text.

Examples:

- Paragraphs
- Tables
- Forms
- Documentation

---

## Body Small

Used for:

- Secondary information
- Metadata
- Supporting descriptions

Body text should remain highly readable during extended sessions.

---

# 8. Labels

Labels identify interface elements.

Examples:

- Form fields
- Buttons
- Navigation
- Filters
- Search

Labels should be concise and descriptive.

---

# 9. Captions

Captions provide supporting information.

Examples:

- Timestamps
- Statistics
- Metadata
- Image descriptions
- Footnotes

Captions should never replace primary content.

---

# 10. Code Style

Monospace typography shall be used for technical information.

Examples include:

- Character IDs
- Government IDs
- Database references
- API identifiers
- Debug output

Technical typography should remain visually distinct from normal content.

---

# 11. Font Weight

The Design System uses a limited set of font weights.

Recommended roles include:

- Regular
- Medium
- Semibold
- Bold

Excessive variation should be avoided.

Weight should communicate hierarchy rather than decoration.

---

# 12. Text Alignment

Alignment should remain consistent.

General rules:

- Body text → Left aligned.
- Numbers → Right aligned in tables.
- Titles → Left aligned.
- Buttons → Center aligned.
- Labels → Left aligned.

Centered paragraphs should generally be avoided outside of landing or marketing screens.

---

# 13. Text Wrapping

Long content should wrap naturally.

Requirements:

- Avoid horizontal scrolling for text.
- Prevent overlapping content.
- Truncate only when necessary.
- Provide tooltips for truncated values where appropriate.

Tables may truncate long values if detailed information is accessible elsewhere.

---

# 14. Numeric Formatting

Numbers should be displayed consistently.

Examples:

- Population
- Votes
- Seats
- Approval ratings
- Currency
- Percentages

Numeric formatting should follow application-wide standards.

---

# 15. Readability

Typography should remain readable under all supported themes.

Requirements include:

- Comfortable line spacing.
- Appropriate paragraph spacing.
- Clear distinction between headings and body text.
- High contrast against backgrounds.

Readability takes precedence over stylistic expression.

---

# 16. Accessibility

Typography shall support accessibility requirements.

Requirements include:

- Scalable text.
- High contrast.
- Clear character shapes.
- Readable minimum sizes.
- Screen reader compatibility.

Text should never become unreadable because of styling choices.

---

# 17. Future Compatibility

Additional typography roles may be introduced when justified.

Existing roles should not be redefined unless a full Design System revision is performed.

Future modules should reuse the established typography hierarchy.

---

# End of Part 3

# 08_DESIGN_SYSTEM.md

# Part 4 of 12 — Spacing, Layout & Grid System

**Project:** WORLDr

**Module:** Political Domain

**Version:** Pre-Alpha v0.1

---

# 1. Purpose

This section defines the spacing system, layout architecture, responsive grid, alignment rules, and sizing principles used throughout the Political Domain.

A consistent spacing and layout system creates visual harmony, improves readability, reduces cognitive load, and ensures every interface feels like part of the same application.

Layouts shall be constructed using standardized spacing tokens rather than arbitrary measurements.

---

# 2. Design Principles

The layout system shall follow these principles.

• Consistency over creativity.

• Predictable spacing.

• Logical grouping of related information.

• Clear visual hierarchy.

• Efficient use of available screen space.

• Comfortable readability during long sessions.

Whitespace should organize information rather than simply create empty areas.

---

# 3. Layout Philosophy

The Political Domain is designed primarily for desktop users.

Interfaces should resemble professional desktop applications rather than mobile-first websites.

Every screen should maximize available workspace while maintaining readability.

Layouts should prioritize information density without creating visual clutter.

---

# 4. Application Grid

Every screen shall be built upon a standardized responsive grid.

The grid provides consistent alignment for all interface components.

Recommended structure:

• Responsive 12-column grid.

• Flexible column widths.

• Consistent gutters.

• Standard outer margins.

No component should ignore the established grid without documented justification.

---

# 5. Application Shell

Every screen is displayed within the shared application shell.

The shell consists of:

• Top Command Bar

• Module Navigation

• Main Workspace

• Optional Context Panel

• Status Bar

Only the Main Workspace changes during navigation.

The surrounding layout remains stable.

---

# 6. Main Workspace

The Main Workspace is the primary content area.

Every module is displayed inside this workspace.

The workspace should:

• Expand to available space.

• Preserve consistent padding.

• Support scrolling when required.

• Maintain visual stability.

Large layout shifts should be avoided.

---

# 7. Content Width

Content should remain readable on large displays.

The Design System defines three content widths.

### Standard

Default application content.

---

### Wide

Tables, dashboards, analytics.

---

### Full Width

Large data grids, legislative records, election results, administrative tools.

Each screen should use the smallest width that comfortably supports its content.

---

# 8. Spacing Scale

Spacing shall be defined using semantic spacing tokens.

Examples include:

Space-XS

Space-S

Space-M

Space-L

Space-XL

Space-XXL

Spacing tokens shall be reused consistently throughout the application.

Hardcoded spacing values should be avoided.

---

# 9. Component Spacing

Every reusable component shall define internal spacing rules.

Examples include:

• Card padding

• Dialog padding

• Table cell spacing

• Button padding

• Form spacing

Components should maintain consistent internal proportions.

---

# 10. Section Spacing

Every screen consists of multiple sections.

Sections should be visually separated through spacing rather than excessive borders.

Typical sections include:

• Header

• Summary

• Primary Content

• Supporting Information

• Actions

• Footer

Spacing should clearly communicate section boundaries.

---

# 11. Alignment Rules

Alignment improves readability.

The following rules apply.

### Left Alignment

Used for:

• Headings

• Paragraphs

• Labels

• Navigation

---

### Center Alignment

Used sparingly.

Examples:

• Loading screens

• Empty states

• Authentication

---

### Right Alignment

Used primarily for:

• Numbers

• Currency

• Statistical values

• Table summaries

---

# 12. Card Layout

Cards should align consistently within available space.

Cards should:

• Maintain equal spacing.

• Follow grid alignment.

• Avoid overlapping.

• Scale naturally with screen size.

Card collections should remain visually balanced.

---

# 13. Table Layout

Tables are one of the most frequently used interface components.

Requirements include:

• Consistent row height.

• Consistent column spacing.

• Fixed headers where appropriate.

• Horizontal scrolling only when necessary.

Large datasets should remain readable.

---

# 14. Form Layout

Forms should emphasize completion speed.

Requirements:

• Group related fields.

• Maintain consistent spacing.

• Align labels consistently.

• Display validation close to affected fields.

Long forms should be divided into logical sections.

---

# 15. Dialog Layout

Dialogs should remain compact.

A dialog should contain:

• Title

• Description

• Content

• Primary Action

• Secondary Action

Dialogs should avoid unnecessary scrolling whenever possible.

---

# 16. Responsive Behavior

The Political Domain is desktop-first.

Recommended support includes:

Large Desktop

Desktop

Laptop

Tablet (Limited)

Mobile devices may receive simplified layouts, but core functionality should remain accessible where supported.

The desktop experience remains the primary design target.

---

# 17. Density

The application shall support a comfortable information density.

Interfaces should:

• Display meaningful information.

• Avoid unnecessary whitespace.

• Avoid overcrowding.

Professional productivity should take priority over visual decoration.

---

# 18. Visual Rhythm

Spacing should establish a predictable rhythm throughout the application.

Components with similar purposes should share similar spacing.

Consistent rhythm improves navigation speed and visual recognition.

---

# 19. Future Compatibility

Additional layouts should extend the existing grid and spacing system.

Future gameplay modules should inherit the same layout architecture to preserve consistency across the entire application.

---

# End of Part 4

# 08_DESIGN_SYSTEM.md

# Part 5 of 12 — Core Components

**Project:** WORLDr

**Module:** Political Domain

**Version:** Pre-Alpha v0.1

---

# 1. Purpose

This section defines the reusable UI components that form the foundation of every interface within the Political Domain.

Every screen shall be constructed from these standardized components.

Components should remain presentation-focused.

Business logic belongs to modules and services, not UI components.

Each component should have a single, clearly defined responsibility.

---

# 2. Component Standards

Every component shall define:

• Purpose

• Variants

• States

• Properties

• Accessibility behavior

• Responsive behavior

• Usage guidelines

Components should never depend on specific political systems.

They should remain reusable throughout the application.

---

# 3. Button

## Purpose

Initiates an action.

Buttons should represent the primary method of interacting with the application.

---

## Variants

• Primary

• Secondary

• Tertiary

• Ghost

• Danger

• Icon Button

---

## States

• Default

• Hover

• Focus

• Pressed

• Disabled

• Loading

---

## Rules

Only one Primary Button should exist within the same action group.

Danger Buttons should only be used for destructive actions.

Loading Buttons should disable additional interaction until completion.

---

# 4. Icon Button

## Purpose

Perform common actions while minimizing occupied space.

Examples:

• Search

• Refresh

• Close

• More Options

• Notifications

---

## Rules

Every Icon Button must include an accessible label.

Icons should never communicate meaning without supporting text where ambiguity exists.

---

# 5. Card

## Purpose

Group related information into a reusable container.

Cards are one of the primary building blocks of the Political Domain.

---

## Variants

• Standard Card

• Summary Card

• Information Card

• Statistic Card

• Interactive Card

---

## Structure

Card Header

↓

Card Content

↓

Card Footer (Optional)

---

## Rules

Cards should never become miniature pages.

Keep information concise.

---

# 6. Badge

## Purpose

Display concise status information.

---

## Examples

• Active

• Pending

• Passed

• Rejected

• Coalition

• Government

• Opposition

---

Badges should communicate status only.

They should not function as buttons.

---

# 7. Chip

## Purpose

Represent small pieces of categorized information.

Examples:

• Political Ideology

• Committee

• Ministry

• Election Type

• Region

---

Chips may optionally support removal where appropriate.

---

# 8. Avatar

## Purpose

Represent people visually.

Used for:

• Politicians

• Players

• Ministers

• Party Leaders

---

If no portrait exists, a generated placeholder should be displayed.

---

# 9. Divider

## Purpose

Separate related content.

Dividers should remain visually subtle.

Whitespace should remain the primary separation method.

---

# 10. Tooltip

## Purpose

Provide short contextual explanations.

---

Rules:

• Appears on hover or focus.

• Should remain concise.

• Should never contain essential information.

Tooltips supplement the interface.

They should never replace good design.

---

# 11. Progress Indicator

## Purpose

Display completion or progress.

Examples:

• Election Progress

• Campaign Progress

• Legislative Process

• Loading Operations

---

Progress indicators should communicate progress clearly without unnecessary animation.

---

# 12. Status Indicator

## Purpose

Display current state.

Examples:

• Online

• Offline

• Active

• In Session

• Waiting

• Archived

Status indicators should combine iconography, color, and text whenever practical.

---

# 13. Empty State

## Purpose

Inform users when no data exists.

Every empty state should include:

• Title

• Description

• Suggested next action

Empty states should never appear as errors.

---

# 14. Skeleton Loader

## Purpose

Maintain layout stability while content loads.

Skeleton loaders should resemble the structure of the final content.

Loading should not shift surrounding interface elements.

---

# 15. Spinner

## Purpose

Indicate short-duration loading.

Spinners should only be used when a skeleton loader is inappropriate.

Avoid displaying spinners for extended operations.

---

# 16. Breadcrumb

## Purpose

Display the user's current location.

Example:

Political Domain

>

Government

>

Cabinet

>

Minister Details

Breadcrumbs improve orientation but should not replace navigation.

---

# 17. Separator

Separators visually distinguish groups of related actions.

They should be used sparingly.

Excessive separators increase visual clutter.

---

# 18. Component Composition

Components should be composable.

Example:

Government Card

contains

Avatar

+

Badge

+

Buttons

+

Status Indicator

+

Typography

No specialized component should duplicate the functionality of its child components.

---

# 19. Component Naming

Every reusable component should follow consistent naming.

Examples:

Button

IconButton

Card

StatisticCard

GovernmentCard

PartyCard

Badge

Tooltip

Avatar

Avoid ambiguous names such as:

ComponentA

CustomButton2

BlueCard

SmallButton

Names should describe purpose rather than appearance.

---

# 20. Future Expansion

New components should only be introduced when existing components cannot reasonably satisfy a new requirement.

Preference should always be given to extending the existing component library.

A smaller, consistent component library is preferable to a large collection of highly specialized components.

---

# End of Part 5
# 08_DESIGN_SYSTEM.md

# Part 6 of 12 — Forms & Input Components

**Project:** WORLDr

**Module:** Political Domain

**Version:** Pre-Alpha v0.1

---

# 1. Purpose

This section defines every reusable form and input component used throughout the Political Domain.

Forms are the primary method through which players interact with the political simulation.

Every input component shall behave consistently regardless of the module in which it is used.

---

# 2. Form Principles

Every form shall:

• Be simple to complete.

• Display clear labels.

• Group related information.

• Validate user input.

• Preserve entered data after validation errors.

• Clearly identify required fields.

• Minimize unnecessary typing.

Forms should guide users toward successful completion rather than merely collecting information.

---

# 3. Form Structure

Every form should follow a consistent structure.

Form Title

↓

Description (Optional)

↓

Input Fields

↓

Validation Messages

↓

Primary Actions

↓

Secondary Actions

Users should immediately understand the purpose of the form before entering information.

---

# 4. Text Input

## Purpose

Collect short text values.

Examples:

• Political Party Name

• Character Name

• Bill Title

• Ministry Name

---

## States

• Default

• Focus

• Filled

• Disabled

• Read Only

• Error

---

## Features

• Placeholder Text

• Character Counter (where appropriate)

• Validation

• Clear Button (Optional)

---

# 5. Text Area

## Purpose

Collect long-form content.

Examples:

• Manifestos

• Government Statements

• Bill Descriptions

• Press Releases

---

## Features

• Multi-line Editing

• Character Counter

• Resize (Optional)

• Validation

---

# 6. Search Field

## Purpose

Locate entities quickly.

Examples:

• Politicians

• Bills

• Political Parties

• Elections

---

## Features

• Instant Search

• Search Suggestions

• Recent Searches

• Clear Button

Search should begin after an appropriate amount of user input.

---

# 7. Dropdown

## Purpose

Select one option from a predefined list.

Examples:

• Ministry

• Committee

• Country

• Election Type

---

## Features

• Search (Large Lists)

• Keyboard Navigation

• Disabled Options

• Grouped Options

---

# 8. Multi-Select

## Purpose

Select multiple values.

Examples:

• Committees

• Tags

• Regions

• Categories

---

Selected values should remain clearly visible.

---

# 9. Checkbox

## Purpose

Enable multiple independent selections.

Examples:

• Notification Preferences

• Filters

• Settings

Checkboxes should never be used when only one option may be selected.

---

# 10. Radio Button

## Purpose

Allow selection of exactly one option.

Examples:

• Government Type

• Voting Method

• Election System

Only one option may be selected within the same group.

---

# 11. Toggle Switch

## Purpose

Enable or disable a setting immediately.

Examples:

• Dark Mode

• Notifications

• Accessibility Options

Switches should perform immediate actions without requiring additional confirmation.

---

# 12. Date Picker

## Purpose

Select dates.

Examples:

• Election Date

• Bill Submission Date

• Historical Search

---

## Features

• Calendar View

• Keyboard Support

• Validation

• Clear Selection

---

# 13. Number Input

## Purpose

Collect numeric values.

Examples:

• Budget

• Population Threshold

• Seat Count

• Vote Requirement

---

## Features

• Minimum Value

• Maximum Value

• Increment Controls

• Validation

---

# 14. File Upload

## Purpose

Upload supported files.

Examples:

• Party Logo

• Profile Picture

• Future Documents

---

## Features

• Drag and Drop

• Progress Indicator

• File Validation

• Preview (where appropriate)

---

# 15. Validation

Validation should occur as early as practical.

Validation categories include:

• Required Field

• Invalid Format

• Duplicate Value

• Length Limit

• Permission Restriction

Validation messages should explain how the user can resolve the problem.

---

# 16. Form Actions

Every form should define clear actions.

Common actions include:

• Save

• Submit

• Create

• Update

• Cancel

• Reset

The primary action should be visually emphasized.

Destructive actions should be visually distinct.

---

# 17. Disabled State

Disabled inputs should:

• Remain readable.

• Clearly communicate unavailable interaction.

• Explain the reason when appropriate.

Users should understand why an input cannot be modified.

---

# 18. Error Messages

Error messages should appear close to the affected input.

They should:

• Clearly describe the problem.

• Avoid technical language.

• Suggest corrective action.

Errors should disappear automatically once resolved.

---

# 19. Success Feedback

Successful form submission should provide immediate confirmation.

Examples include:

• Success Banner

• Toast Notification

• Confirmation Dialog

The application should clearly communicate that the requested action has been completed.

---

# 20. Accessibility

All form components shall support:

• Keyboard Navigation

• Screen Readers

• Focus Indicators

• Descriptive Labels

• Error Announcements

• Logical Tab Order

Accessibility shall be considered during component implementation rather than added afterward.

---

# 21. Future Compatibility

Future input components should extend the existing form system rather than introduce new interaction patterns.

Examples may include:

• Rich Text Editor

• Mention Input

• AI-Assisted Input

• Formula Editor

• Advanced Search Builder

Future components should inherit the same validation, accessibility, and interaction standards.

---

# End of Part 6

# 08_DESIGN_SYSTEM.md

# Part 7 of 12 — Data Display Components

**Project:** WORLDr

**Module:** Political Domain

**Version:** Pre-Alpha v0.1

---

# 1. Purpose

This section defines the reusable components used to display structured information throughout the Political Domain.

Political systems generate large amounts of information including governments, legislation, elections, political parties, politicians, statistics, historical records, and simulation data.

These components provide consistent methods for presenting that information while maintaining readability, discoverability, and efficiency.

---

# 2. Data Display Principles

Every data display component shall follow these principles.

• Prioritize readability.

• Support efficient comparison.

• Scale to large datasets.

• Preserve consistent layouts.

• Minimize unnecessary scrolling.

• Support searching and filtering where appropriate.

Information should always be easier to understand than the raw data it represents.

---

# 3. Data Table

## Purpose

Display structured information using rows and columns.

Tables are the primary method of presenting political information.

---

## Common Uses

• Politicians

• Political Parties

• Bills

• Governments

• Elections

• Ministries

• Committee Members

• Historical Records

---

## Features

• Sorting

• Filtering

• Searching

• Pagination

• Virtual Scrolling

• Row Selection

• Sticky Headers

• Column Resizing (Future)

---

## Rules

Columns should remain consistent throughout the application.

Tables should avoid unnecessary horizontal scrolling.

Primary identifiers should remain visible whenever practical.

---

# 4. Data Grid

## Purpose

Display large collections of structured records with greater flexibility than traditional tables.

Examples include:

• National Statistics

• Administrative Records

• Election Data

• Simulation Logs

---

Data Grids should support advanced interaction while preserving performance.

---

# 5. List

## Purpose

Display ordered collections where detailed tabular comparison is unnecessary.

Examples include:

• Notifications

• News Articles

• Activity Feed

• Search Results

• Cabinet Agenda

---

Lists should support:

• Icons

• Badges

• Secondary Information

• Quick Actions

---

# 6. Timeline

## Purpose

Display chronological events.

Examples include:

• Political Career

• Government History

• Election Timeline

• Legislative Process

• National Events

---

## Features

• Chronological Ordering

• Date Labels

• Event Categories

• Expandable Details

• Filters

Timelines should emphasize sequence rather than quantity.

---

# 7. Statistics Card

## Purpose

Display a single important metric.

Examples include:

• Public Approval

• Active Bills

• Legislature Seats

• Government Stability

• Election Turnout

---

Each Statistics Card should include:

• Title

• Primary Value

• Optional Trend

• Optional Comparison

• Optional Time Period

---

# 8. Analytics Dashboard

## Purpose

Display multiple related statistics within a unified analytical view.

Examples include:

• Election Dashboard

• Government Performance

• Party Performance

• National Political Activity

---

Dashboards should emphasize relationships between metrics rather than isolated values.

---

# 9. Chart Components

Charts communicate trends and comparisons.

Charts should supplement—not replace—numerical information.

Whenever possible, charts should include accessible textual summaries.

---

# 10. Line Chart

## Purpose

Display change over time.

Examples:

• Approval Rating

• Political Stability

• Public Support

• Government Performance

---

Best suited for continuous trends.

---

# 11. Bar Chart

## Purpose

Compare categories.

Examples:

• Legislature Seats

• Party Membership

• Election Results

• Budget Allocation

---

Bars should be ordered logically.

---

# 12. Pie / Donut Chart

## Purpose

Display proportional distribution.

Examples:

• Legislature Composition

• Coalition Breakdown

• Ministry Distribution

---

Pie charts should be used only when comparing a small number of categories.

Complex comparisons should use bar charts instead.

---

# 13. Progress Visualization

Used to communicate completion.

Examples:

• Campaign Progress

• Legislative Process

• Election Schedule

• Simulation Progress

Progress components should communicate remaining work as clearly as completed work.

---

# 14. Comparison Component

## Purpose

Compare two or more entities.

Examples:

• Political Parties

• Governments

• Candidates

• Bills

• Elections

Comparison layouts should align identical attributes together.

---

# 15. Ranking List

## Purpose

Display ordered information.

Examples:

• Most Popular Politicians

• Largest Political Parties

• Highest Approval

• Most Active Legislators

Rankings should clearly display ranking methodology where appropriate.

---

# 16. Activity Feed

## Purpose

Display recent events.

Examples:

• Government Decisions

• Legislature Activity

• Party Actions

• Cabinet Appointments

• Political Statements

Activity feeds should emphasize recency.

---

# 17. History Viewer

## Purpose

Present archived political records.

Features include:

• Search

• Filtering

• Date Range

• Category Selection

• Historical Comparison

Historical information should remain immutable unless modified by administrative systems.

---

# 18. Empty Data States

Every data display component shall define an empty state.

Examples include:

"No active legislation."

"No historical records found."

"No search results."

Empty states should suggest the next logical action whenever possible.

---

# 19. Loading States

Data-heavy components should display skeleton layouts while loading.

Loading indicators should preserve layout stability.

Large datasets should load progressively whenever practical.

---

# 20. Responsive Behavior

Large datasets should adapt to available screen space.

Strategies include:

• Column Prioritization

• Horizontal Scrolling

• Expandable Rows

• Responsive Cards

Readability should always take precedence over displaying every column simultaneously.

---

# 21. Accessibility

Every data display component shall support:

• Keyboard Navigation

• Screen Readers

• Sort Announcements

• Accessible Tables

• Chart Descriptions

• High Contrast Themes

Users should be able to interpret data regardless of visual ability.

---

# 22. Future Compatibility

Future visualization components may include:

• Heat Maps

• Geographic Maps

• Sankey Diagrams

• Network Graphs

• Predictive Analytics

• AI Insights

All future components should inherit the same interaction and accessibility standards.

---

# End of Part 7

# 08_DESIGN_SYSTEM.md

# Part 8 of 12 — Navigation Components

**Project:** WORLDr

**Module:** Political Domain

**Version:** Pre-Alpha v0.1

---

# 1. Purpose

This section defines the reusable navigation components used throughout the Political Domain.

Navigation components allow users to move efficiently between domains, modules, screens, records, and contextual information while preserving orientation and minimizing unnecessary interactions.

Navigation should always communicate:

• Where the user is.

• Where the user can go.

• How to return.

---

# 2. Navigation Principles

Every navigation component shall follow these principles.

• Be predictable.

• Minimize navigation depth.

• Preserve user context.

• Clearly indicate the active location.

• Support keyboard navigation.

• Scale as additional modules are introduced.

Navigation should never confuse the user about their current location.

---

# 3. Navigation Hierarchy

The Political Domain follows a four-level navigation hierarchy.

Application

↓

Domain

↓

Module

↓

Screen

↓

Context

Each level has a distinct responsibility and should not duplicate another.

---

# 4. Sidebar Navigation

## Purpose

Provide persistent access to all primary modules.

---

## Contents

• Dashboard

• Political Parties

• Government

• Legislature

• Elections

• Media

• History

• Profile

• Settings

---

## Behavior

• Always visible on desktop.

• Highlights the active module.

• Supports optional collapse.

• Preserves scroll position.

• Displays icons alongside labels.

The sidebar is the primary navigation component for the Political Domain.

---

# 5. Top Command Bar

## Purpose

Provide application-level actions.

---

## Contents

• Global Search

• Notifications

• Current Date

• Simulation Speed

• Profile Menu

• Settings Shortcut

---

The Top Command Bar remains visible throughout the application.

Module-specific actions should never appear here.

---

# 6. Tabs

## Purpose

Navigate between related screens within a module.

Examples:

Government

• Overview

• Cabinet

• Ministries

• Agenda

• Reports

---

## Behavior

• One active tab.

• Preserve state during navigation.

• Support keyboard navigation.

• Display overflow handling when necessary.

Tabs should never replace module navigation.

---

# 7. Breadcrumb Navigation

## Purpose

Display the user's current location.

Example:

Political Domain

>

Government

>

Cabinet

>

Minister Details

---

## Behavior

• Every level is clickable except the current page.

• Hidden on simple screens where unnecessary.

• Updates automatically during navigation.

Breadcrumbs improve orientation but should not replace navigation menus.

---

# 8. Pagination

## Purpose

Navigate through large datasets.

Examples:

• Bills

• Politicians

• Elections

• Historical Records

---

## Features

• First Page

• Previous Page

• Next Page

• Last Page

• Direct Page Selection

• Page Size Selector

Pagination should preserve sorting and filtering.

---

# 9. Search Navigation

Search provides direct navigation to application content.

Search results may include:

• Politicians

• Governments

• Bills

• Political Parties

• Elections

• Ministries

• Historical Records

Selecting a result navigates directly to the appropriate screen.

---

# 10. Context Menu

## Purpose

Provide actions related to a specific object.

Examples:

Political Party

• Open

• Edit

• Invite Member

• Leave Party

Government

• View Details

• View Cabinet

• Open Reports

---

Context menus should contain only actions relevant to the selected object.

---

# 11. Dropdown Menu

## Purpose

Display compact groups of related actions.

Examples:

• User Menu

• Settings Menu

• Export Options

• More Actions

Dropdown menus should remain short and logically organized.

---

# 12. Accordion

## Purpose

Expand or collapse related content.

Examples:

• Frequently Asked Questions

• Legislative Sections

• Advanced Filters

• Historical Details

Only one interaction should be required to reveal additional information.

---

# 13. Tree View

## Purpose

Display hierarchical information.

Examples:

• Government Structure

• Ministry Hierarchy

• Committee Organization

• Future Administrative Structures

Tree views should clearly indicate parent-child relationships.

---

# 14. Stepper

## Purpose

Guide users through multi-step processes.

Examples:

• Character Creation

• Party Creation

• Bill Submission

• Government Formation

---

## Features

• Current Step

• Completed Steps

• Remaining Steps

• Progress Indicator

Users should always know where they are within the process.

---

# 15. Command Palette

## Purpose

Provide keyboard-first navigation and quick actions.

Examples:

• Open Government

• Search Bills

• View Profile

• Create Political Party

• Open Legislature

---

## Behavior

• Activated by keyboard shortcut.

• Supports fuzzy search.

• Executes actions directly.

The Command Palette improves productivity for experienced users.

---

# 16. Navigation Drawer

## Purpose

Provide temporary navigation on smaller screens.

The Navigation Drawer replaces the persistent sidebar where screen space is limited.

It should:

• Slide into view.

• Preserve navigation hierarchy.

• Close after selection.

---

# 17. Back Navigation

Back navigation should return users to their previous context whenever possible.

Examples:

Bill Details

↓

Bills List

↓

Legislature

↓

Dashboard

Navigation should avoid unnecessary resets of filters, sorting, or scroll position.

---

# 18. Deep Linking

Every significant screen should support direct navigation through a unique route.

Examples include:

• Government Overview

• Bill Details

• Election Results

• Politician Profile

Deep links should restore the expected interface state.

---

# 19. Navigation States

Every navigation component shall support:

• Default

• Hover

• Focus

• Active

• Disabled

• Expanded (where applicable)

State behavior should remain consistent across all navigation components.

---

# 20. Accessibility

Navigation components shall support:

• Keyboard Navigation

• Screen Readers

• Focus Indicators

• Logical Tab Order

• ARIA Labels

Users should be able to navigate the entire Political Domain without relying on a mouse.

---

# 21. Future Compatibility

Future navigation components may include:

• Workspace Switching

• Recently Visited Screens

• Favorites

• Bookmarks

• Custom Navigation

• AI Navigation Assistant

Future additions should extend the existing navigation architecture rather than replace it.

---

# End of Part 8

# 08_DESIGN_SYSTEM.md

# Part 9 of 12 — Feedback Components

**Project:** WORLDr

**Module:** Political Domain

**Version:** Pre-Alpha v0.1

---

# 1. Purpose

This section defines the reusable feedback components used throughout the Political Domain.

Feedback components communicate system status, user action results, warnings, confirmations, and errors.

Every significant interaction should provide clear, timely, and meaningful feedback.

Feedback should reduce uncertainty rather than interrupt workflow.

---

# 2. Feedback Principles

Every feedback component shall follow these principles.

• Be immediate.

• Be informative.

• Be proportional to the event.

• Avoid unnecessary interruption.

• Help users recover from problems.

Feedback should communicate what happened, why it happened, and what the user can do next.

---

# 3. Alert

## Purpose

Display important information that requires user attention within the current screen.

---

## Variants

• Information

• Success

• Warning

• Error

---

## Structure

Alert Icon

↓

Title

↓

Description

↓

Optional Actions

---

## Usage

Alerts should be used for important contextual information.

They should not interrupt the user's workflow.

---

# 4. Toast Notification

## Purpose

Provide lightweight, temporary feedback for completed actions.

---

## Examples

• Political Party Created

• Changes Saved

• Bill Submitted

• Government Updated

---

## Behavior

• Appears briefly.

• Dismisses automatically.

• May be dismissed manually.

• Does not block interaction.

Toasts should not communicate critical information.

---

# 5. Notification

## Purpose

Inform users about events occurring within the simulation.

---

## Categories

• Government

• Legislature

• Elections

• Political Parties

• Media

• System

---

## States

• Unread

• Read

• Archived

Notifications remain available until archived or removed.

---

# 6. Confirmation Dialog

## Purpose

Confirm actions with significant consequences.

---

## Example Usage

• Leave Political Party

• Withdraw Bill

• Delete Draft

• Resign Position

---

## Structure

Title

↓

Description

↓

Consequences

↓

Primary Action

↓

Cancel

Confirmation dialogs should explain the impact before requesting confirmation.

---

# 7. Modal Dialog

## Purpose

Focus user attention on a specific task.

---

## Typical Usage

• Create Political Party

• Edit Government

• View Detailed Information

• Configure Settings

---

## Rules

• One primary purpose.

• Clear exit options.

• Prevent accidental dismissal when data may be lost.

Modals should not become full application screens.

---

# 8. Drawer

## Purpose

Display secondary information without leaving the current screen.

---

## Example Usage

• Politician Details

• Bill Summary

• Government Information

• Notification Details

---

Drawers allow users to inspect information while preserving context.

---

# 9. Banner

## Purpose

Display application-wide messages.

---

## Examples

• Scheduled Maintenance

• New Version Available

• Server Connection Issues

• Major Simulation Event

---

Banners remain visible until dismissed or no longer relevant.

---

# 10. Inline Validation

## Purpose

Provide immediate feedback while completing forms.

---

## Examples

• Required Field

• Invalid Value

• Duplicate Name

• Permission Restriction

Validation messages should appear beside the affected input whenever possible.

---

# 11. Empty State

## Purpose

Explain why no information is currently available.

---

## Structure

Illustration (Optional)

↓

Title

↓

Description

↓

Suggested Action

---

Every empty state should guide the user toward the next logical step.

---

# 12. Loading Feedback

Loading indicators communicate ongoing operations.

Supported methods include:

• Skeleton Loader

• Spinner

• Progress Bar

• Determinate Progress

The selected method should match the expected duration and complexity of the operation.

---

# 13. Progress Dialog

## Purpose

Display the progress of long-running operations.

---

## Examples

• Importing Data

• Processing Simulation

• Uploading Files

• Administrative Operations

---

Progress dialogs should display estimated completion whenever possible.

---

# 14. Error Display

## Purpose

Communicate failures clearly and constructively.

---

Every error should include:

• Clear title.

• Human-readable description.

• Recovery guidance.

• Retry option where appropriate.

Technical implementation details should never be exposed.

---

# 15. Success Feedback

Success feedback confirms that the requested operation completed successfully.

Examples include:

• Save Complete

• Bill Approved

• Election Registered

• Government Formed

Success feedback should reinforce confidence without disrupting workflow.

---

# 16. Warning Feedback

Warnings indicate potential issues requiring attention.

Examples include:

• Unsaved Changes

• Deadline Approaching

• Missing Information

Warnings should encourage action without implying failure.

---

# 17. Blocking vs Non-Blocking Feedback

Feedback should be classified appropriately.

### Blocking

Requires immediate user interaction.

Examples:

• Confirmation Dialog

• Critical Error

• Permission Required

---

### Non-Blocking

Allows work to continue.

Examples:

• Toast

• Notification

• Success Message

• Information Banner

Blocking feedback should be reserved for situations where user intervention is genuinely required.

---

# 18. Feedback Priority

Feedback shall follow a consistent priority order.

Critical

↓

Error

↓

Warning

↓

Success

↓

Information

↓

Background Status

Higher-priority feedback should never be obscured by lower-priority messages.

---

# 19. Accessibility

Feedback components shall support:

• Screen Readers

• Keyboard Navigation

• Focus Management

• ARIA Live Regions

• High Contrast Themes

Critical feedback should always be announced to assistive technologies.

---

# 20. Future Compatibility

Future feedback components may include:

• AI Recommendations

• Collaborative Notifications

• Live Simulation Events

• Guided Tutorials

• Smart Suggestions

All future components should extend the existing feedback framework and maintain consistent interaction patterns.

---

# End of Part 9

# 08_DESIGN_SYSTEM.md

# Part 10 of 12 — Advanced Components

**Project:** WORLDr

**Module:** Political Domain

**Version:** Pre-Alpha v0.1

---

# 1. Purpose

This section defines advanced interface components used throughout the Political Domain.

These components improve efficiency when working with large datasets, complex workflows, administrative tools, and high-information-density screens.

Advanced components should extend the core component library while preserving consistency with the Design System.

---

# 2. Design Principles

Advanced components shall:

• Reduce repetitive actions.

• Improve navigation efficiency.

• Support power users.

• Scale with increasing data complexity.

• Remain intuitive for new users.

Complexity should only be introduced when it provides measurable usability benefits.

---

# 3. Filter Panel

## Purpose

Allow users to narrow large datasets using multiple criteria.

---

## Example Usage

• Bills

• Elections

• Politicians

• Governments

• Historical Records

---

## Features

• Multi-select filters

• Date range

• Status filters

• Category filters

• Saved filters (Future)

• Reset filters

---

Filter changes should update displayed data without requiring unnecessary page reloads.

---

# 4. Sort Panel

## Purpose

Allow users to control the ordering of displayed information.

---

## Features

• Ascending

• Descending

• Multiple sort fields (Future)

• Reset sorting

Sorting should remain consistent throughout the application.

---

# 5. Search Panel

## Purpose

Provide advanced searching across structured information.

---

## Features

• Keyword search

• Field-specific search

• Search history

• Search suggestions

• Recent searches

• Clear search

Search should integrate seamlessly with filtering and sorting.

---

# 6. Command Palette

## Purpose

Provide keyboard-first access to navigation and actions.

---

## Example Actions

• Open Dashboard

• Create Political Party

• Search Bills

• Open Government

• View Elections

• Open Settings

---

## Features

• Keyboard shortcut

• Fuzzy search

• Action grouping

• Recently used actions

• Fast execution

The Command Palette should improve productivity for experienced users.

---

# 7. Split View

## Purpose

Allow users to view related information simultaneously.

---

## Example Usage

Left Panel

Bill List

Right Panel

Bill Details

---

Other examples include:

• Politician List + Profile

• Election List + Results

• Government List + Cabinet

Split View reduces unnecessary navigation.

---

# 8. Inspector Panel

## Purpose

Display contextual information about the selected object.

---

## Example Usage

Selecting a bill displays:

• Summary

• Status

• Author

• Timeline

• Voting History

The Inspector should update automatically when selection changes.

---

# 9. Context Actions

## Purpose

Provide quick actions for the selected object.

---

## Example Usage

Political Party

• View

• Edit

• Invite Member

• Leave

Bill

• Open

• Debate

• Vote

• Withdraw

Only actions valid for the current context should be displayed.

---

# 10. Bulk Actions

## Purpose

Perform the same operation on multiple records.

---

## Examples

• Archive Notifications

• Delete Drafts

• Export Records

• Mark as Read

---

Bulk actions should display the number of selected items before execution.

Destructive bulk actions require confirmation.

---

# 11. Step Wizard

## Purpose

Guide users through complex, multi-step workflows.

---

## Example Usage

• Character Creation

• Political Party Creation

• Government Formation

• Bill Submission

---

## Features

• Step Indicator

• Progress Tracking

• Previous

• Next

• Save Draft (Optional)

Users should be able to understand their progress at any point.

---

# 12. Side Panel

## Purpose

Display supplementary information without leaving the current screen.

---

## Example Usage

• News Details

• Politician Summary

• Ministry Information

• Election Statistics

The Side Panel should preserve the user's current workflow.

---

# 13. Comparison View

## Purpose

Compare multiple entities side by side.

---

## Examples

• Political Parties

• Candidates

• Governments

• Bills

• Elections

Attributes should remain aligned for easy comparison.

---

# 14. Data Export

## Purpose

Allow users to export information.

---

## Supported Formats

• CSV

• Excel

• PDF (Future)

• JSON (Administrative)

Exported data should respect active filters and sorting.

---

# 15. Import Wizard

## Purpose

Guide users through importing supported datasets.

---

## Features

• File Selection

• Validation

• Preview

• Error Reporting

• Import Summary

Invalid data should be reported before import begins.

---

# 16. Activity Inspector

## Purpose

Display detailed information about system events.

---

## Example Usage

• Government Actions

• Legislature Activity

• Election Events

• Political History

Activity Inspectors should provide chronological context and related information.

---

# 17. Workspace Persistence

The application should preserve the user's working environment.

Examples include:

• Open panels

• Active filters

• Selected tabs

• Sorting

• Scroll position

Users should be able to resume work without unnecessary setup.

---

# 18. Accessibility

Advanced components shall support:

• Keyboard Navigation

• Screen Readers

• Focus Management

• Logical Navigation Order

• High Contrast Themes

Advanced functionality should remain accessible to all users.

---

# 19. Future Compatibility

Future advanced components may include:

• AI Assistant Panel

• Live Collaboration

• Workspace Layouts

• Predictive Filters

• Saved Views

• Personal Dashboards

• Cross-Domain Search

All future components should extend this architecture rather than introducing conflicting interaction patterns.

---

# End of Part 10

# 08_DESIGN_SYSTEM.md

# Part 11 of 12 — Accessibility Standards

**Project:** WORLDr

**Module:** Political Domain

**Version:** Pre-Alpha v0.1

---

# 1. Purpose

This section defines the accessibility standards that apply to every interface, component, interaction, and workflow within the Political Domain.

Accessibility is a core design requirement and shall be considered during initial design and implementation rather than added after development.

Every feature should remain usable by the widest possible range of users.

---

# 2. Accessibility Principles

The Political Domain shall follow these principles.

• Perceivable

• Operable

• Understandable

• Robust

Accessibility should improve the overall user experience without reducing functionality.

---

# 3. Keyboard Accessibility

Every interactive element shall be fully usable using only a keyboard.

Supported interactions include:

• Navigation

• Forms

• Tables

• Menus

• Dialogs

• Search

• Filters

• Context Menus

Users should never become trapped within an interface component.

---

# 4. Focus Management

Keyboard focus shall always be visible.

Focus should:

• Move logically.

• Never disappear unexpectedly.

• Return appropriately after dialogs close.

• Follow a predictable order.

Focus should never rely solely on browser defaults.

---

# 5. Tab Order

Interactive elements shall follow a logical navigation order.

The tab sequence should match the visual layout of the interface.

Unexpected focus jumps should be avoided.

---

# 6. Screen Reader Support

Every interface shall provide meaningful information to assistive technologies.

Requirements include:

• Semantic HTML.

• Descriptive labels.

• Proper heading hierarchy.

• Accessible tables.

• Accessible forms.

Visual layout should never be the only method of communicating information.

---

# 7. Accessible Labels

Every interactive component shall have an accessible name.

Examples include:

• Buttons

• Icon Buttons

• Search Fields

• Dropdowns

• Checkboxes

• Radio Buttons

• Navigation Items

Icons alone shall not be considered sufficient labels.

---

# 8. Form Accessibility

Forms shall provide:

• Explicit labels.

• Required field indicators.

• Accessible validation messages.

• Logical grouping.

• Clear instructions.

Error messages should identify the affected input.

---

# 9. Table Accessibility

Tables shall support:

• Header identification.

• Logical row and column relationships.

• Keyboard navigation.

• Accessible sorting indicators.

Large tables should remain navigable without requiring a mouse.

---

# 10. Color Accessibility

Color shall never be the sole method of conveying information.

Examples include:

Instead of:

Red = Error

Use:

Error Icon

+

Red Color

+

Text Message

Every important state should include multiple visual indicators.

---

# 11. Contrast

Text and interactive elements shall maintain sufficient contrast against their backgrounds.

Contrast should remain readable under:

• Dark Mode

• Light Mode (Future)

• High Contrast Mode

Readability takes priority over decorative styling.

---

# 12. Motion

Animations should improve usability rather than distract users.

Requirements:

• Support reduced-motion preferences.

• Avoid excessive animation.

• Prevent flashing effects.

• Keep transitions brief.

Animations should reinforce user actions rather than entertain.

---

# 13. Scaling

The interface should remain usable when text size increases.

Requirements include:

• No overlapping content.

• No clipped text.

• No hidden controls.

Layouts should adapt naturally to increased font sizes.

---

# 14. Responsive Accessibility

Accessibility requirements apply across all supported screen sizes.

Keyboard navigation, focus management, and readable layouts shall remain consistent regardless of viewport dimensions.

---

# 15. Error Recovery

Users should be able to recover from errors easily.

Requirements:

• Clear explanations.

• Suggested corrective actions.

• Preservation of entered data.

• Retry options where appropriate.

Error messages should help users succeed rather than merely report failures.

---

# 16. Time-Based Interactions

Interfaces should avoid unnecessary time limits.

If time-sensitive interactions are required, users should receive sufficient warning and, where appropriate, the ability to extend available time.

---

# 17. Language

Interface language should remain:

• Clear

• Consistent

• Concise

• Free from unnecessary technical terminology

Labels should describe actions rather than implementation details.

---

# 18. Localization

The Design System should support future localization.

Requirements include:

• Variable text lengths.

• Date formatting.

• Number formatting.

• Currency formatting.

• Right-to-left language compatibility (Future).

Interface layouts should accommodate translated content without redesign.

---

# 19. Accessibility Testing

Accessibility verification should become part of the development process.

Recommended validation includes:

• Keyboard-only navigation.

• Screen reader testing.

• Focus visibility checks.

• Color contrast verification.

• Responsive testing.

Accessibility issues should be treated as functional defects rather than cosmetic improvements.

---

# 20. Future Compatibility

Future accessibility improvements may include:

• Voice Navigation

• Speech Recognition

• AI Accessibility Assistance

• Personalized Accessibility Profiles

• Enhanced Screen Reader Support

All future features should extend the existing accessibility framework.

---

# End of Part 11

# 08_DESIGN_SYSTEM.md

# Part 12 of 12 — Design Tokens, Frontend Standards & Implementation Guidelines

**Project:** WORLDr

**Module:** Political Domain

**Version:** Pre-Alpha v0.1

---

# 1. Purpose

This section establishes the implementation standards that connect the Design System to the frontend codebase.

It defines how design decisions should be translated into reusable components, design tokens, project organization, and development conventions.

All frontend implementations shall follow these standards to ensure consistency, maintainability, scalability, and long-term compatibility.

---

# 2. Design Token Philosophy

Visual properties shall be represented by semantic design tokens rather than hardcoded values.

Design tokens provide a centralized source of truth for visual styling.

Changing a token should update every component that references it without requiring component-level modifications.

---

# 3. Token Categories

The Design System shall define standardized tokens for:

## Colors

Examples:

• Primary

• Secondary

• Surface

• Background

• Border

• Success

• Warning

• Error

• Information

---

## Typography

Examples:

• Display

• Heading

• Body

• Caption

• Label

• Code

---

## Spacing

Examples:

• XS

• S

• M

• L

• XL

• XXL

---

## Border Radius

Examples:

• Small

• Medium

• Large

• Pill

• Circular

---

## Shadows

Examples:

• Small

• Medium

• Large

• Overlay

---

## Animation

Examples:

• Fast

• Normal

• Slow

---

## Layering

Examples:

• Base

• Dropdown

• Sticky

• Modal

• Toast

• Tooltip

---

# 4. Naming Conventions

Names should describe purpose rather than appearance.

Preferred:

GovernmentCard

StatisticCard

PrimaryButton

NotificationPanel

Avoid:

BlueButton

Card2

LargeCard

NewButton

Naming should remain meaningful even if the visual design changes.

---

# 5. Component Organization

Reusable components should be organized by category.

Examples include:

• Navigation

• Forms

• Feedback

• Data Display

• Layout

• Overlays

• Utilities

Each component should exist only once within the shared component library.

Business-specific components should compose these generic components rather than duplicate them.

---

# 6. Component Architecture

Every reusable component should define:

• Purpose

• Supported Variants

• Supported States

• Public Properties

• Events

• Accessibility Requirements

• Responsive Behavior

Components should expose a stable public interface.

Internal implementation details should remain encapsulated.

---

# 7. Component Composition

Complex interfaces should be assembled from smaller reusable components.

Example:

GovernmentCard

contains

• Avatar

• Badge

• Heading

• Statistic

• Action Buttons

• Status Indicator

Components should compose rather than inherit whenever practical.

---

# 8. Styling Strategy

Styling should prioritize:

• Reusability

• Maintainability

• Predictability

• Theme compatibility

Visual styling should reference design tokens instead of hardcoded values.

---

# 9. Theme Architecture

Themes should modify token values rather than component implementations.

The Design System should support:

• Default Theme

• Dark Theme

• Light Theme (Future)

• Seasonal Themes (Future)

Component behavior should remain identical across all themes.

---

# 10. Animation Standards

Animations should reinforce interaction.

Recommended animation categories include:

• Hover

• Focus

• Expand

• Collapse

• Loading

• Navigation

Animations should remain subtle and consistent.

They should never delay user interaction.

---

# 11. Responsive Standards

The frontend should follow the responsive principles defined within this Design System.

Layouts should adapt through:

• Flexible grids

• Responsive spacing

• Component resizing

• Layout reflow

Components should remain usable across supported viewport sizes.

---

# 12. Asset Management

Visual assets should remain organized.

Examples include:

• Icons

• Illustrations

• Logos

• Flags

• Portraits

• Background Images

Assets should follow consistent naming conventions and version control practices.

---

# 13. Icon Standards

Icons should support recognition rather than decoration.

Requirements include:

• Consistent visual style

• Appropriate sizing

• Semantic meaning

• Accessibility labels

Icons should accompany text whenever ambiguity may occur.

---

# 14. State Management Guidelines

User interface state should remain separate from business logic.

Examples of UI state include:

• Dialog visibility

• Selected tab

• Expanded sections

• Search input

• Active filters

Simulation logic, political rules, and persistent data should remain outside the component layer.

---

# 15. Performance Guidelines

Frontend implementations should prioritize:

• Fast initial rendering

• Efficient updates

• Component reuse

• Lazy loading where appropriate

• Minimal unnecessary rendering

Performance optimizations should preserve readability and maintainability.

---

# 16. Documentation Requirements

Every reusable component should include documentation describing:

• Purpose

• Variants

• Supported Properties

• Accessibility

• Example Usage

• Interaction Notes

Component documentation should remain synchronized with implementation.

---

# 17. Versioning

The Design System shall evolve through versioned releases.

Breaking changes should be documented.

Existing components should remain stable whenever possible.

Major revisions should preserve backward compatibility where practical.

---

# 18. Future Expansion

Future gameplay systems should adopt this Design System rather than creating independent component libraries.

Examples include:

• Economy Domain

• Military Domain

• Business Domain

• Diplomacy Domain

• Intelligence Domain

The Design System should become the shared visual foundation for the entire WORLDr application.

---

# 19. Compliance

Frontend implementations shall be considered compliant when they:

• Use shared components.

• Use design tokens.

• Follow naming conventions.

• Meet accessibility standards.

• Preserve responsive behavior.

• Follow documented interaction patterns.

Any deviation should be documented and justified.

---

# 20. Conclusion

The WORLDr Design System establishes the visual, structural, and interaction standards for the Political Domain.

Its purpose is to ensure that every interface feels consistent, scalable, maintainable, and intuitive regardless of the feature being implemented.

As the project grows beyond the Political Domain, this Design System shall serve as the single source of truth for frontend development across the entire application.

---

# End of Part 12

**End of 08_DESIGN_SYSTEM.md**