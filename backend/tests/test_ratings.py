"""
Tests for the /ratings router.

This file starts paying down the zero-coverage debt on /ratings (v1 §11).
For now it covers query-param validation on GET /ratings (the rankings
endpoint): bad date strings must return 422 (a client error — "you sent
garbage") instead of leaking through to the database and crashing as a
500 (a server error — "we broke").

The `client` and `mock_supabase` fixtures come from conftest.py — they
give us a FastAPI test client with the real routes but a fake database,
so no test ever touches Supabase.
"""


class TestGetRankingsParamValidation:
    """Query-param validation on GET /ratings (§8.12 defect class)."""

    def test_invalid_weekend_of(self, client, mock_supabase):
        """Garbage weekend_of should 422, not 500."""
        response = client.get("/ratings?weekend_of=not-a-date")
        assert response.status_code == 422

    def test_non_friday_weekend_of(self, client, mock_supabase):
        """weekend_of is a weekend KEY, so it must be exactly a Friday."""
        response = client.get("/ratings?weekend_of=2025-08-09")  # Saturday
        assert response.status_code == 422

    def test_invalid_weekend_range(self, client, mock_supabase):
        """Garbage range bounds should 422, not 500."""
        response = client.get("/ratings?weekend_from=abc&weekend_to=2026-01-30")
        assert response.status_code == 422

    def test_invalid_weekend_range_to(self, client, mock_supabase):
        """Both bounds are validated, not just the first."""
        response = client.get("/ratings?weekend_from=2026-01-02&weekend_to=garbage")
        assert response.status_code == 422

    def test_non_friday_range_bounds_allowed(self, client, mock_supabase):
        """Range bounds feed >= / <= comparisons, so any real date is fine —
        only the exact-key weekend_of param demands a Friday."""
        # Empty ratings lookup for the requesting IP, empty parties result.
        mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.order.return_value.order.return_value.execute.return_value.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

        response = client.get("/ratings?weekend_from=2026-01-01&weekend_to=2026-01-31")
        assert response.status_code == 200
