Hosting a SpyneJS Application

SpyneJS applications are single-page applications (SPAs) and can be deployed on any modern hosting platform that supports basic rewrite rules.

No framework-specific server, middleware, or runtime is required.

⸻

Required Routing Behavior

Correct routing configuration is the only requirement for hosting a SpyneJS application.

1. Application Routes

All requests to application paths must return:

/index.html

This allows the SpyneJS runtime to manage routing and application state internally.

Examples of application routes:
•	/
•	/about
•	/products/123
•	/dashboard/settings

All of the above must resolve to index.html.

⸻

2. Static Assets

Requests for static resources must return the actual file and must not be rewritten.

Static assets are served from:

/assets/*

Examples:
•	/assets/main.js
•	/assets/styles.css
•	/assets/images/logo.png

These requests should bypass SPA rewrite rules entirely.

⸻

Universal Deployment Prompt

Use the following prompt when configuring hosting, working with DevOps teams, or using AI-assisted deployment tools:

This application is a single-page application.

All non-file application routes should return index.html.

Requests to /assets/* must return the corresponding file directly and must not be rewritten.

No server-side rendering or additional routing logic is required.

This configuration works for all established hosting platforms, including static hosts, CDNs, and traditional web servers.

⸻

Embedding SpyneJS in Other Applications

SpyneJS can be embedded inside existing systems such as CMSs, portals, or enterprise shell applications.

When embedding:
•	Prefer query-based routing over path-based routing
•	Use URL parameters to drive application state and navigation
•	Avoid intercepting or rewriting host application routes

SpyneJS provides a query route type specifically for this purpose.

This approach allows SpyneJS to operate as a contained application engine without interfering with the host application’s routing model.

⸻

Summary
•	Works on any modern hosting platform
•	Requires only basic rewrite rules
•	Clean separation between application routes and static assets
•	Safe to embed inside existing applications

SpyneJS is intentionally deployment-agnostic.
