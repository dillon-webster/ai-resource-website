# Mobile Optimization Design

## Goal

Improve the mobile homepage experience without changing the desktop layout. Mobile should show all three lab identities subtly in the animated background, make the news section easy to use by touch, and get users to search and resources faster.

## Scope

- Keep the desktop news cards and hover expansion behavior unchanged.
- Keep the desktop animated background composition unchanged.
- Add mobile-specific behavior below the `sm` breakpoint.
- Do not change resource storage, voting, admin, or server behavior.

## Mobile Background

On small screens, the Three.js logo sprites use a separate mobile composition. The three logos should appear as a faint floating stack instead of desktop-positioned sprites. Claude appears near the upper-left area, Gemini near the upper-right or center-right area, and Codex lower in the viewport. The logos are smaller and lower opacity than desktop so they read as atmosphere instead of primary content.

Mobile should not use the news hover/focus camera behavior. The background can continue to animate gently, but tapping news tabs should not zoom the scene toward a logo. Desktop retains the existing focus behavior.

## Mobile News

Below the `sm` breakpoint, the news strip becomes a touch-first tab interface:

- Show a compact segmented row with `Anthropic`, `Google AI`, and `OpenAI`.
- Show one selected source at a time.
- Default selected source is the first source with articles, falling back to Anthropic.
- Show the selected source's latest article first, then the remaining articles as a vertical list.
- Use normal links for articles.
- Do not use hover expansion or absolutely positioned dropdowns on mobile.

At `sm` and above, keep the current three-card grid and hover expansion.

## Mobile Page Spacing

Tighten mobile spacing so the first screen is not dominated by the background or hero:

- Reduce top padding on the homepage content on mobile.
- Reduce the mobile hero heading size and margins.
- Keep search and category chips directly accessible after news.

## Testing

Verify with a production build. When a local browser is available, inspect at a mobile viewport and desktop viewport:

- Mobile shows a usable single-source news tab layout.
- Mobile background does not show only Gemini.
- Desktop news and background behavior remain visually unchanged.
