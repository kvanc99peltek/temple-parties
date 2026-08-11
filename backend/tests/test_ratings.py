"""
Tests for the /ratings router (Epic 7.2 + param validation).
"""
from unittest.mock import MagicMock, patch
from datetime import datetime

from tests.conftest import create_mock_auth_response, create_mock_db_response
from app.services.weekend import EASTERN


class TestGetRankingsParamValidation:
    """Query-param validation on GET /ratings (§8.12 defect class)."""

    def test_invalid_weekend_of(self, client, mock_supabase):
        response = client.get("/ratings?weekend_of=not-a-date")
        assert response.status_code == 422

    def test_non_friday_weekend_of(self, client, mock_supabase):
        response = client.get("/ratings?weekend_of=2025-08-09")  # Saturday
        assert response.status_code == 422

    def test_invalid_weekend_range(self, client, mock_supabase):
        response = client.get("/ratings?weekend_from=abc&weekend_to=2026-01-30")
        assert response.status_code == 422

    def test_invalid_weekend_range_to(self, client, mock_supabase):
        response = client.get("/ratings?weekend_from=2026-01-02&weekend_to=garbage")
        assert response.status_code == 422

    def test_non_friday_range_bounds_allowed(self, client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.order.return_value.order.return_value.execute.return_value.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

        response = client.get("/ratings?weekend_from=2026-01-01&weekend_to=2026-01-31")
        assert response.status_code == 200


class TestSubmitRating:
    """POST /ratings/{party_id} — auth + user_id + approved + window."""

    def test_submit_rating_unauthenticated(self, client, mock_supabase, mock_party):
        response = client.post(
            f"/ratings/{mock_party['id']}",
            json={"rating": 1},
        )
        assert response.status_code == 401

    def test_submit_rating_non_approved(self, client, mock_supabase, mock_user, mock_party):
        mock_party["status"] = "pending"
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([mock_party])

        response = client.post(
            f"/ratings/{mock_party['id']}",
            json={"rating": 1},
            headers={"Authorization": "Bearer valid_token"},
        )
        assert response.status_code == 403
        assert "approved" in response.json()["detail"].lower()

    def test_submit_rating_before_doors(self, client, mock_supabase, mock_user, mock_party):
        mock_party["doors_open"] = "10 PM"
        mock_party["date"] = "2025-08-08"
        mock_party["weekend_of"] = "2025-08-08"
        mock_party["day"] = "friday"
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([mock_party])

        with patch(
            "app.routers.ratings.is_rating_active",
            return_value=False,
        ), patch(
            "app.routers.ratings.is_rating_locked",
            return_value=False,
        ):
            response = client.post(
                f"/ratings/{mock_party['id']}",
                json={"rating": 1},
                headers={"Authorization": "Bearer valid_token"},
            )
        assert response.status_code == 403
        assert "not yet active" in response.json()["detail"].lower()

    def test_submit_rating_after_lock(self, client, mock_supabase, mock_user, mock_party):
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([mock_party])

        with patch("app.routers.ratings.is_rating_active", return_value=True), patch(
            "app.routers.ratings.is_rating_locked", return_value=True
        ):
            response = client.post(
                f"/ratings/{mock_party['id']}",
                json={"rating": 1},
                headers={"Authorization": "Bearer valid_token"},
            )
        assert response.status_code == 403
        assert "ended" in response.json()["detail"].lower()

    def test_submit_rating_insert(self, client, mock_supabase, mock_user, mock_party):
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )

        def mock_table(table_name):
            mock_tbl = MagicMock()
            if table_name == "parties":
                mock_tbl.select.return_value.eq.return_value.execute.return_value = \
                    create_mock_db_response([mock_party])
                mock_tbl.update.return_value.eq.return_value.execute.return_value = \
                    create_mock_db_response([])
            elif table_name == "party_ratings":
                # existing check empty, then all ratings after insert
                mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = \
                    create_mock_db_response([])
                mock_tbl.select.return_value.eq.return_value.execute.return_value = \
                    create_mock_db_response([{"rating": 1}])
                mock_tbl.insert.return_value.execute.return_value = \
                    create_mock_db_response([])
            return mock_tbl

        mock_supabase.table = mock_table

        with patch("app.routers.ratings.is_rating_active", return_value=True), patch(
            "app.routers.ratings.is_rating_locked", return_value=False
        ):
            response = client.post(
                f"/ratings/{mock_party['id']}",
                json={"rating": 1},
                headers={"Authorization": "Bearer valid_token"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["rating"] == 1
        assert data["ratingCount"] == 1
        assert data["likePercentage"] == 100.0

    def test_submit_rating_update_in_place(self, client, mock_supabase, mock_user, mock_party):
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )

        def mock_table(table_name):
            mock_tbl = MagicMock()
            if table_name == "parties":
                mock_tbl.select.return_value.eq.return_value.execute.return_value = \
                    create_mock_db_response([mock_party])
                mock_tbl.update.return_value.eq.return_value.execute.return_value = \
                    create_mock_db_response([])
            elif table_name == "party_ratings":
                mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = \
                    create_mock_db_response([{"id": "rating-1"}])
                mock_tbl.select.return_value.eq.return_value.execute.return_value = \
                    create_mock_db_response([{"rating": 0}])
                mock_tbl.update.return_value.eq.return_value.eq.return_value.execute.return_value = \
                    create_mock_db_response([])
            return mock_tbl

        mock_supabase.table = mock_table

        with patch("app.routers.ratings.is_rating_active", return_value=True), patch(
            "app.routers.ratings.is_rating_locked", return_value=False
        ):
            response = client.post(
                f"/ratings/{mock_party['id']}",
                json={"rating": 0},
                headers={"Authorization": "Bearer valid_token"},
            )

        assert response.status_code == 200
        assert response.json()["rating"] == 0
        assert response.json()["likePercentage"] == 0.0
