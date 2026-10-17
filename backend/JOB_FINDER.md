# Job Finder setup

The Job Finder is an authenticated, user-confirmed search flow. Interpreting a prompt only creates or updates a draft. External job providers are called only by `POST /jobs/finder/searches/{search_id}/run`.

## Backend configuration

Configure these variables in the backend environment (never in Vite or browser variables):

- `GROQ_API_KEY` — required for prompt interpretation and optional match scoring.
- `SERPAPI_API_KEY` — primary Google Jobs search provider. `SERPAPI_KEY` is also accepted.
- `FIRECRAWL_API_KEY` — optional; enriches up to five results with short descriptions per search.
- Existing `RAPIDAPI_KEY_1`, `RAPIDAPI_KEY_2`, etc. — JSearch fallback credentials.
- `GROQ_MODEL` — optional model override; defaults to `openai/gpt-oss-120b`.
- Groq chat completions use LangChain's `ChatGroq` integration (`langchain-groq`).

Per-user provider limits are configured in `services/rate_limiter.py`. Search documents and results are stored in the `job_searches` and `job_search_results` MongoDB collections. The server creates their indexes during startup.

## API flow

1. `POST /jobs/finder/interpret` with `{ "message": "...", "search_id": null }` returns a draft id and validated filters.
2. The client lets the user edit the filters. Follow-up messages send the same `search_id` to update the draft without searching.
3. `POST /jobs/finder/searches/{search_id}/run` with `{ "filters": { ... }, "send_email": false }` performs provider searches and persists results.
4. `GET /jobs/finder/searches` lists the authenticated user's searches; `GET /jobs/finder/searches/{search_id}/results` returns saved results.

All API keys remain server-side. External provider quotas and pricing may change; verify current account limits before enabling this feature for production users.
