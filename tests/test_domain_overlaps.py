import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from check_domain_overlaps import audit, intersections
from validate_rules import Rule


class DomainOverlapReview(unittest.TestCase):
    def test_all_current_intersections_have_a_reviewed_policy(self):
        self.assertEqual(audit()["problems"], [])

    def test_ai_and_meta_never_intersect(self):
        actual = intersections()
        self.assertFalse([pair for pair in actual if {item[0] for item in pair} == {"AI", "Meta"}])

    def test_exact_duplicates_and_nested_suffixes_are_detected_with_label_boundaries(self):
        data = {
            "A": [Rule("DOMAIN", "tenant.example.com"), Rule("DOMAIN", "same.test")],
            "B": [Rule("DOMAIN-SUFFIX", "example.com"), Rule("DOMAIN", "same.test")],
            "C": [Rule("DOMAIN-SUFFIX", "notexample.com")],
        }
        with patch("check_domain_overlaps.GROUPS", tuple(data)), patch(
                "check_domain_overlaps.read_rules", side_effect=lambda path, client: data[path.stem]):
            actual = intersections()
        self.assertEqual(actual, {
            (("A", "DOMAIN", "tenant.example.com"), ("B", "DOMAIN-SUFFIX", "example.com")),
            (("A", "DOMAIN", "same.test"), ("B", "DOMAIN", "same.test")),
        })


if __name__ == "__main__":
    unittest.main()
