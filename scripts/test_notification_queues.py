"""Isolated policy/serialization tests; ORM and URL resolver are mocked, no DB needed."""
import importlib.util
from datetime import datetime, timezone
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace as NS
import unittest
from unittest.mock import MagicMock, patch

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1] / ".backend-work"


def load(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def stub(name, **attributes):
    module = ModuleType(name)
    module.__dict__.update(attributes)
    return module


models = {name: NS(objects=None) for name in ("Profile", "Contact", "SponsorFeedback", "SavingsTransaction")}
url_stub = stub("django.urls", reverse=lambda name, args=(): f"/{name}/" + "/".join(map(str, args)))
with patch.dict(sys.modules, {"django.urls": url_stub}):
    roles = load("queue_test_roles", "apps/users/roles.py")
with patch.dict(sys.modules, {
    "django.urls": url_stub,
    "apps.users.roles": roles,
    "apps.users.models": stub("apps.users.models", Profile=models["Profile"], Contact=models["Contact"]),
    "apps.sponsor.models": stub("apps.sponsor.models", SponsorFeedback=models["SponsorFeedback"]),
    "apps.savings.models": stub("apps.savings.models", SavingsTransaction=models["SavingsTransaction"]),
}):
    queues = load("notification_queue_unit_tests", "api/v1/notification_queues.py")


def user(role, *, resolved=None, authenticated=True):
    return NS(is_authenticated=authenticated, profile=NS(
        role=role, resolved_staff_role=resolved or role,
        resolved_account_type="staff" if (resolved or role) in roles.STAFF_ROLE_LABELS else role,
    ))


class NotificationQueueTests(unittest.TestCase):
    def setUp(self):
        self.queries = {}
        for name, model in models.items():
            manager, query = MagicMock(), MagicMock()
            model.objects = manager
            for operation in ("select_related", "filter", "unread"):
                getattr(manager, operation).return_value = query
            for operation in ("filter", "order_by", "with_related"):
                getattr(query, operation).return_value = query
            query.count.return_value = 0
            query.__getitem__.return_value = []
            self.queries[name] = query

    def records(self, name, records):
        query = self.queries[name]
        query.count.return_value = len(records)
        query.__getitem__.side_effect = lambda key: records[key]

    def test_role_matrix_matches_web_review_permissions(self):
        expected = {
            "administrator": {"activations", "feedback", "withdrawals"},
            "manager": {"feedback"}, "ed": {"feedback"},
            "hof": {"feedback", "withdrawals"}, "accountant": {"feedback", "withdrawals"},
            "boo": {"feedback"}, "staff": {"feedback"},
        }
        for role, visible in expected.items():
            with self.subTest(role=role):
                self.assertEqual({item["id"] for item in queues.notification_work_queues(user(role))}, visible)
                self.assertEqual(queues.queue_permissions(user(role))["user_feedback"], role in {"administrator", "manager", "ed", "hof"})

    def test_outsiders_do_not_query_any_operational_records(self):
        for account in [user("guest"), user("client"), user("sponsor"), user("administrator", authenticated=False), NS(is_authenticated=True, profile=None)]:
            self.assertEqual(queues.notification_work_queues(account), [])
        for model in models.values():
            self.assertEqual(model.objects.mock_calls, [])

    def test_current_role_and_legacy_role_are_supported(self):
        self.assertTrue(queues.queue_permissions(user("guest", resolved="administrator"))["activations"])
        self.assertTrue(queues.queue_permissions(user("administrator"))["activations"])

    def test_guest_preview_is_bounded_and_excludes_assigned_accounts(self):
        self.records("Profile", [NS(pk=i, user=NS(username=f"guest{i}")) for i in range(8)])
        activation = queues.notification_work_queues(user("administrator"))[0]
        self.assertEqual(activation["count"], 8)
        self.assertEqual(len(activation["items"]), 5)
        self.queries["Profile"].filter.assert_called_once_with(account_type="guest", role="guest", staff_role="", client__isnull=True, sponsor__isnull=True)

    def test_feedback_filters_and_source_permissions(self):
        now = datetime.now(timezone.utc)
        self.records("SponsorFeedback", [NS(pk=1, subject="Sponsor question", sponsor=NS(first_name="Test", last_name="Sponsor"), created_at=now)])
        self.records("Contact", [NS(pk=2, name="Private contact", message="Support request", created_at=now)])
        boo = queues.notification_work_queues(user("boo"))[0]
        self.assertEqual(boo["count"], 1)
        self.assertEqual([item["id"] for item in boo["items"]], ["sponsor-feedback-1"])
        models["Contact"].objects.filter.assert_not_called()
        manager = queues.notification_work_queues(user("manager"))[0]
        self.assertEqual(manager["count"], 2)
        models["Contact"].objects.filter.assert_called_once_with(is_valid=False)
        models["SponsorFeedback"].objects.unread.assert_called()

    def test_withdrawal_uses_client_id_for_mobile_and_account_id_for_web(self):
        self.records("SavingsTransaction", [NS(pk=3, amount="5000.00", account_id=99, account=NS(client_id=12, client=NS(full_name="Test Client")))])
        withdrawal = next(item for item in queues.notification_work_queues(user("accountant")) if item["id"] == "withdrawals")
        self.assertEqual(withdrawal["items"][0]["client_id"], 12)
        self.assertEqual(withdrawal["items"][0]["web_path"], "/savings_account_detail/99")
        self.queries["SavingsTransaction"].filter.assert_called_once_with(status="pending", transaction_type="withdrawal")


if __name__ == "__main__":
    unittest.main()
