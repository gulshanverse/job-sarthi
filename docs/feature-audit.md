# Job Sarthi Production-Polish Audit

**Audit basis:** source-code review, schema migration review, server and client type checking, authenticated desktop/mobile/tablet workspace captures, and review of the managed deployment constraints.

## Verified implementation status

| Area | Status | Current evidence and boundary |
| --- | --- | --- |
| Authentication and access control | Implemented | Manus OAuth manages identity. Candidate APIs use `protectedProcedure`; job operations use `adminProcedure`; candidate data is never rendered by the admin page. Password flows are intentionally outside this OAuth-based application. |
| Candidate data and review | Implemented | Profiles retain contact details, preferences, skills, experience, education, projects, certifications, profile confirmation, and candidate-controlled review. |
| Resume privacy and resilience | Implemented | Private storage metadata, PDF/DOCX extension and signature checks, a 5 MB server limit, SHA-256 duplicate detection, measurable client file-read progress, structured processing states, and retry handling are present. |
| Explainable relevance | Implemented | A centralized 100-point score combines skills (45), role direction (20), experience (15), education (10), location (5), and preferences (5). The LLM only turns grounded results into readable explanations. |
| Jobs and details | Implemented | Active jobs are queried with server-side parameterized search, filters, sorting, counting, and pagination. Detail pages expose available metadata and preserve the candidate-controlled external-application sequence. |
| Saved jobs and applications | Implemented | Unique persistence guards duplicates. The saved query invalidates after a shared job-card save action. Candidate stages include saved, applied, under review, interviewing, offer, selected, and rejected. |
| Dashboard and career insights | Implemented | Dashboard next actions and completion evidence use actual profile, application, recommendation, and skill-gap query data. Career frequency evidence narrows to selected recommended jobs when chosen. |
| Notifications | Implemented | A candidate-private inbox lists, marks read, and dismisses meaningful profile, resume, high-match, and application-milestone events. `(userId, fingerprint)` prevents duplicate event rows. |
| Event refresh and scheduling | Implemented, deployment activation pending | Confirmed profile updates refresh recommendations. Newly active admin-published jobs are rule-evaluated against confirmed profiles without admin access to profile data. A task-UID keyed, cron-authenticated weekly in-app digest callback is mounted, but must be enabled only after publishing. |
| Admin job management | Implemented | The role-gated `/admin/jobs` route supports verified job creation and status updates. Active roles are evaluated privately; this is not a candidate-data dashboard. |
| Responsive and accessible UX | Implemented | Authenticated layouts were captured at desktop, 768 px tablet, and 375 px mobile. The sidebar, command navigation, notification menu, labels, focusable controls, loading, empty, and error states remain usable at these viewports. |

## Performance and data-flow evidence

The jobs browser debounces keyword changes and uses server-side filters, sort order, `count(*)`, `LIMIT`, and `OFFSET`; it does not download an unbounded job collection and filter it in the browser. Recommendation generation evaluates a bounded active-job slice, while candidate weekly digest and notification queries have explicit limits. Client mutations invalidate targeted tRPC queries rather than running polling loops. The deployed workload contains no in-process timer, `setInterval`, or `node-cron` dependency.

## Focused accessibility verification

The protected shell exposes a visible command-navigation trigger on supported widths and a `⌘K` / `Ctrl+K` keyboard shortcut. Its command dialog presents labeled workspace destinations and only includes the admin destination for an admin session. The notification trigger has a dynamic accessible label, while the read and dismiss controls have explicit labels and remain regular keyboard-focusable buttons. Candidate routes use labeled form controls and route-specific loading, retry, error, and empty states. The tablet and mobile captures confirm that the compact shell preserves the notification affordance while the full sidebar and command trigger remain available at tablet and desktop widths.

The focused Vitest/jsdom pass executes the protected-shell keyboard path rather than only inspecting source: `Tab` moves focus to the command trigger, `Ctrl+K` focuses the command input, the focused trigger matches `:focus-visible`, the admin destination is present only in an admin configuration, and selecting it closes the dialog before navigation. The notification pass tabs to the dynamic-label trigger, opens it from the keyboard, confirms the actionable control can receive DOM focus, and invokes its labeled **Mark as read** and **Dismiss notification** controls. Notification actions now carry explicit focus-visible rings; shared buttons supply focus-visible rings for command, pagination, and admin controls. The browser tests also prove a candidate receives the admin-access boundary while an administrator receives publishing controls.

The rendered job-detail test verifies visible employer, compensation, and education metadata plus save, tracking, external open, and post-submission actions. The jobs-browser test verifies that a keyword waits for its 320 ms debounce, each filter resets pagination, and active keyword and role filters persist when the user advances to the next page. Server-level tests cover strict protected-procedure, invalid-input, secure resume-file, matching, selected-job skill-gap, and shared saved-role synchronization contracts.

> No synthetic job listings, external-application submissions, user testimonials, or candidate-private admin data are used to make the experience appear more complete than its stored data supports.

## Remaining validation and deployment actions

The remaining work is final validation and release: continue targeted coverage for jobs and career-insight data flows, run the full test/type-check/build suite, review the final Git diff, and create the release checkpoint. Once the published site is reachable, a confirmed candidate can enable the weekly in-app digest from Profile and the cron callback can be tested end-to-end.
