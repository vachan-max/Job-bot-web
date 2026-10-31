import json
import os
import unittest
from unittest.mock import AsyncMock, Mock, patch

from models.job_finder import JobSearchFilters
from services.job_finder.interpreter import interpret_filters, is_job_related
from services.job_finder.pipeline import canonical_link, discover_jobs
from services.job_finder.providers import serpapi


class FilterModelTests(unittest.TestCase):
    def test_filter_limits_and_cleanup(self):
        filters = JobSearchFilters(job_titles=[" Analyst ", "Analyst", ""], results_limit=30)
        self.assertEqual(filters.job_titles, ["Analyst"])
        with self.assertRaises(ValueError):
            JobSearchFilters(results_limit=31)

    def test_interpreter_preserves_current_values_omitted_by_model(self):
        fake_response = Mock()
        fake_response.content = json.dumps({
            "filters": {"locations": ["Mumbai"]}, "assistant_message": "Updated location."
        })
        baseline = {
            "job_titles": ["Data Analyst"], "industries": ["Fintech"], "locations": ["Pune"],
            "experience_level": "Fresher", "skills": ["Excel"], "keywords": [],
            "employment_types": [], "remote_preference": "any", "date_posted": "week", "results_limit": 12,
        }
        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}), patch("services.job_finder.interpreter.create_job_finder_chat") as groq:
            groq.return_value.invoke.return_value = fake_response
            filters, message = interpret_filters("Change location to Mumbai", baseline, {})
        self.assertEqual(filters.locations, ["Mumbai"])
        self.assertEqual(filters.job_titles, ["Data Analyst"])
        self.assertEqual(filters.results_limit, 12)
        self.assertEqual(message, "Updated location.")

    def test_intent_classifier_returns_boolean(self):
        fake_response = Mock()
        fake_response.content = json.dumps({"job_related": False})
        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}), patch("services.job_finder.interpreter.create_job_finder_chat") as groq:
            groq.return_value.invoke.return_value = fake_response
            self.assertFalse(is_job_related("Find the best hotel in Mumbai"))

    def test_groq_chat_models_are_independently_configurable(self):
        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}, clear=True), patch("services.groq_chat.ChatGroq") as chat:
            from services.groq_chat import create_groq_chat, create_job_finder_chat
            create_groq_chat()
            create_job_finder_chat()
        self.assertEqual(chat.call_args_list[0].kwargs["model"], "openai/gpt-oss-120b")
        self.assertEqual(chat.call_args_list[1].kwargs["model"], "openai/gpt-oss-20b")


class InterpretationRouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_job_related_message_still_creates_a_saved_draft(self):
        from bson import ObjectId
        from routes.job_finder import interpret_search
        from models.job_finder import InterpretSearchRequest

        inserted_id = ObjectId()
        with patch("routes.job_finder.users_col.find_one", new=AsyncMock(return_value={"_id": "user-1"})), \
             patch("routes.job_finder.preferences_col.find_one", new=AsyncMock(return_value={})), \
             patch("routes.job_finder.job_searches_col.find_one", new=AsyncMock(return_value=None)), \
             patch("routes.job_finder.job_searches_col.insert_one", new=AsyncMock(return_value=Mock(inserted_id=inserted_id))) as insert, \
             patch("routes.job_finder.check_and_increment", new=AsyncMock(return_value={"allowed": True})), \
             patch("routes.job_finder.is_job_related", return_value=True), \
             patch("routes.job_finder.interpret_filters", return_value=(JobSearchFilters(job_titles=["Engineer"]), "Review the filters.")):
            response = await interpret_search(InterpretSearchRequest(message="Find engineer jobs in Mumbai"), {"uid": "firebase-1"})

        self.assertTrue(response.job_related)
        self.assertEqual(response.search_id, str(inserted_id))
        self.assertEqual(response.filters.job_titles, ["Engineer"])
        saved_document = insert.await_args.args[0]
        self.assertEqual([entry["content"] for entry in saved_document["conversation"] if entry["role"] == "user"], ["Find engineer jobs in Mumbai"])

    async def test_unrelated_new_message_is_not_persisted(self):
        from routes.job_finder import interpret_search
        from models.job_finder import InterpretSearchRequest

        with patch("routes.job_finder.users_col.find_one", new=AsyncMock(return_value={"_id": "user-1"})), \
             patch("routes.job_finder.preferences_col.find_one", new=AsyncMock(return_value={})), \
             patch("routes.job_finder.job_searches_col.find_one", new=AsyncMock(return_value=None)), \
             patch("routes.job_finder.job_searches_col.insert_one", new=AsyncMock()) as insert, \
             patch("routes.job_finder.job_searches_col.update_one", new=AsyncMock()) as update, \
             patch("routes.job_finder.check_and_increment", new=AsyncMock(return_value={"allowed": True})), \
             patch("routes.job_finder.is_job_related", return_value=False), \
             patch("routes.job_finder.interpret_filters") as parse:
            response = await interpret_search(InterpretSearchRequest(message="Find the best hotel in Mumbai"), {"uid": "firebase-1"})

        self.assertFalse(response.job_related)
        self.assertIsNone(response.search_id)
        self.assertIn("only used to search for jobs", response.assistant_message)
        insert.assert_not_awaited()
        update.assert_not_awaited()
        parse.assert_not_called()

    async def test_unrelated_followup_leaves_saved_draft_untouched(self):
        from bson import ObjectId
        from routes.job_finder import interpret_search
        from models.job_finder import InterpretSearchRequest

        search_id = str(ObjectId())
        search_doc = {"_id": ObjectId(search_id), "user_id": "user-1", "filters": {"job_titles": ["Engineer"]}, "conversation": [{"role": "user", "content": "Find engineering jobs"}]}
        with patch("routes.job_finder.users_col.find_one", new=AsyncMock(return_value={"_id": "user-1"})), \
             patch("routes.job_finder.preferences_col.find_one", new=AsyncMock(return_value={})), \
             patch("routes.job_finder.job_searches_col.find_one", new=AsyncMock(return_value=search_doc)), \
             patch("routes.job_finder.job_searches_col.insert_one", new=AsyncMock()) as insert, \
             patch("routes.job_finder.job_searches_col.update_one", new=AsyncMock()) as update, \
             patch("routes.job_finder.check_and_increment", new=AsyncMock(return_value={"allowed": True})), \
             patch("routes.job_finder.is_job_related", return_value=False), \
             patch("routes.job_finder.interpret_filters") as parse:
            response = await interpret_search(InterpretSearchRequest(message="Find the best hotel in Mumbai", search_id=search_id), {"uid": "firebase-1"})

        self.assertFalse(response.job_related)
        self.assertIsNone(response.search_id)
        insert.assert_not_awaited()
        update.assert_not_awaited()
        parse.assert_not_called()


class ProviderTests(unittest.TestCase):
    def test_serpapi_normalizes_google_jobs_result(self):
        response = Mock()
        response.json.return_value = {"jobs_results": [{
            "title": "Risk Analyst", "company_name": "Example Bank", "location": "Mumbai",
            "description": "Risk reporting and analytics", "via": "Google", "share_link": "https://jobs.example/1",
            "apply_options": [{"link": "https://careers.example/1"}],
            "detected_extensions": {"posted_at": "2 days ago"},
        }]}
        response.raise_for_status.return_value = None
        with patch.dict(os.environ, {"SERPAPI_API_KEY": "test-key"}), patch("services.job_finder.providers.serpapi.requests.get", return_value=response):
            jobs = serpapi.search_jobs(JobSearchFilters(job_titles=["Risk Analyst"]).model_dump())
        self.assertEqual(jobs[0]["apply_link"], "https://careers.example/1")
        self.assertEqual(jobs[0]["source_url"], "https://jobs.example/1")
        self.assertEqual(jobs[0]["posted_at"], "2 days ago")
        self.assertEqual(jobs[0]["industry"], "")

    def test_missing_serpapi_key_is_reported(self):
        with patch.dict(os.environ, {}, clear=True), self.assertRaises(serpapi.ProviderError):
            serpapi.search_jobs(JobSearchFilters(job_titles=["Nurse"]).model_dump())

    def test_canonical_link_removes_fragment_and_trailing_slash(self):
        self.assertEqual(canonical_link("HTTPS://Jobs.Example/role/1/#apply"), "https://jobs.example/role/1")


class FallbackTests(unittest.IsolatedAsyncioTestCase):
    async def test_serpapi_empty_results_use_jsearch(self):
        allowed = AsyncMock(return_value=True)
        job = {"job_title": "Nurse", "apply_link": "https://example.com/1"}
        with patch("services.job_finder.pipeline.serpapi.search_jobs", return_value=[]), patch("services.job_finder.pipeline.jsearch.search_jobs", return_value=[job]):
            jobs, provider, reason = await discover_jobs(JobSearchFilters(job_titles=["Nurse"]), True, allowed)
        self.assertEqual(provider, "jsearch")
        self.assertEqual(jobs, [job])
        self.assertIn("no results", reason.lower())
        allowed.assert_awaited_once()

    async def test_serpapi_results_skip_jsearch(self):
        job = {"job_title": "Nurse", "apply_link": "https://example.com/1"}
        with patch("services.job_finder.pipeline.serpapi.search_jobs", return_value=[job]), patch("services.job_finder.pipeline.jsearch.search_jobs") as fallback:
            jobs, provider, _ = await discover_jobs(JobSearchFilters(job_titles=["Nurse"]), True, Mock())
        self.assertEqual(provider, "serpapi")
        self.assertEqual(jobs, [job])
        fallback.assert_not_called()

    async def test_jsearch_is_not_called_without_quota(self):
        with patch("services.job_finder.pipeline.serpapi.search_jobs", return_value=[]), patch("services.job_finder.pipeline.jsearch.search_jobs") as fallback:
            with self.assertRaisesRegex(RuntimeError, "quota is unavailable"):
                await discover_jobs(JobSearchFilters(job_titles=["Nurse"]), True, AsyncMock(return_value=False))
        fallback.assert_not_called()


if __name__ == "__main__":
    unittest.main()
