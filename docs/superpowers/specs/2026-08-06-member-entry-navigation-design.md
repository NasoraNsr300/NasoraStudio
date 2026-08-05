# Member Entry and Navigation Design

## Goal

Make the signed-in member area easy to enter from anywhere without replacing the website's existing sidebar navigation.

## Entry point

- Keep the existing global website sidebar unchanged.
- The floating account button at the bottom-right is the member entry point.
- Clicking the floating button opens a compact popover with exactly two actions:
  1. Notifications, including an unread count when applicable.
  2. Member area.
- Notifications open a small contextual notification panel.
- Member area navigates to the member estimate-request page at `/{locale}/member/requests`.
- For the current UI mockup, authentication and notification data remain fixtures.

## Member-area navigation

- Member pages use a persistent horizontal tab bar near the top of the content.
- The tabs are Estimate requests, Messages, Payments, and Profile.
- The active tab is visually distinct and each tab is a direct route link.
- A message unread badge appears on the Messages tab.
- The current member side rail is removed from the four member overview pages.
- Job detail remains a separate page reached from member content. It uses the same member-area tab navigation instead of duplicating a side rail.

## Layout boundaries

- The floating account control and its popovers are one shared global component.
- The member tab bar is one shared member-navigation component.
- Each member page keeps its own content component and layout styles so changing one page does not unexpectedly alter another.
- Member content uses the shared page-shell width already used across the site.

## Interaction and accessibility

- The floating popover closes by clicking outside, pressing Escape, or choosing an action.
- Buttons expose expanded state and the popover is keyboard reachable.
- Active member tabs use `aria-current="page"`.
- Unread counts include readable labels rather than relying only on color.

## Scope

This pass covers visual layout, navigation links, and local mock interactions. Backend authentication, persisted notifications, and live unread counts are deferred.

## Acceptance criteria

- The global sidebar is still available.
- The bottom-right floating account button opens two actions: Notifications and Member area.
- Member area opens the estimate-request page.
- All four member pages display the same horizontal tab bar and no member side rail.
- The job-detail page can navigate back into the member area through the same tab pattern.
- Existing page-specific content remains intact.
