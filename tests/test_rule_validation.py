import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest

MODULE = Path(__file__).resolve().parents[1] / "tools/validate_rules.py"
SPEC = importlib.util.spec_from_file_location("validate_rules", MODULE)
rules = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = rules
SPEC.loader.exec_module(rules)


class NativeRules(unittest.TestCase):
    def test_native_names_are_not_interchangeable(self):
        for text, client in [("DOMAIN,example.com", "QuantumultX"),
                             ("HOST,example.com", "Loon"),
                             ("IP6-CIDR,2001:db8::/32", "Surge"),
                             ("USER-AGENT,Spotify*", "Clash")]:
            with self.subTest(client=client, text=text), self.assertRaises(ValueError):
                rules.parse_rule(text, client)

    def test_quantumult_native_names_normalize(self):
        self.assertEqual(rules.parse_rule("HOST-SUFFIX,example.com", "QuantumultX"),
                         rules.parse_rule("DOMAIN-SUFFIX,example.com", "Loon"))

    def test_rules_cannot_embed_a_policy(self):
        with self.assertRaises(ValueError):
            rules.parse_rule("DOMAIN,example.com,MyPrivatePolicy", "Surge")

    def test_ip_family_and_host_bits(self):
        for text in ["IP-CIDR,2001:db8::/32", "IP-CIDR6,192.0.2.0/24",
                     "IP-CIDR,192.0.2.1/24", "IP-CIDR,999.0.0.0/8"]:
            with self.subTest(text=text), self.assertRaises(ValueError):
                rules.parse_rule(text, "Loon")

    def test_no_resolve_is_only_valid_for_ip_rules(self):
        with self.assertRaises(ValueError):
            rules.parse_rule("DOMAIN,example.com,no-resolve", "Loon")
        self.assertEqual(rules.parse_rule("IP-CIDR,192.0.2.0/24,no-resolve", "Surge").flags,
                         ("no-resolve",))

    def test_suffix_keeps_label_boundary(self):
        rule = rules.parse_rule("DOMAIN-SUFFIX,example.com", "Loon")
        for host in ["example.com", "www.example.com", "WWW.EXAMPLE.COM."]:
            self.assertTrue(rules.matches(rule, {"host": host}))
        for host in ["notexample.com", "example.com.attacker.invalid"]:
            self.assertFalse(rules.matches(rule, {"host": host}))

    def test_domain_rule_is_exact(self):
        rule = rules.parse_rule("DOMAIN,cdn.example.com", "Loon")
        self.assertTrue(rules.matches(rule, {"host": "cdn.example.com"}))
        self.assertFalse(rules.matches(rule, {"host": "unrelated.cdn.example.com"}))

    def test_udp_and_source_port_both_required(self):
        rule = rules.parse_rule("AND,((PROTOCOL,UDP),(SRC-PORT,9000))", "Loon")
        self.assertTrue(rules.matches(rule, {"network": "udp", "source_port": 9000}))
        self.assertFalse(rules.matches(rule, {"network": "tcp", "source_port": 9000}))
        self.assertFalse(rules.matches(rule, {"network": "udp", "source_port": 8000}))

    def test_malformed_logic_is_rejected(self):
        for text in ["AND,((PROTOCOL,UDP),(SRC-PORT,9000)",
                     "AND,((PROTOCOL,UDP))", "AND,(PROTOCOL,UDP)"]:
            with self.subTest(text=text), self.assertRaises(ValueError):
                rules.parse_rule(text, "Loon")

    def test_host_without_address_does_not_trigger_network_lookup(self):
        rule = rules.parse_rule("IP-CIDR,192.0.2.0/24,no-resolve", "Loon")
        self.assertFalse(rules.matches(rule, {"host": "example.com"}))
        self.assertTrue(rules.matches(rule, {"host": "example.com", "ip": "192.0.2.5"}))

    def test_yaml_duplicates_and_unsafe_tags_are_rejected(self):
        for text in ['payload: []\npayload: []\n', 'payload: !!python/object:object {}\n']:
            with self.subTest(text=text), self.assertRaises((ValueError, rules.yaml.YAMLError)):
                rules.yaml.load(text, Loader=rules.UniqueLoader)

    def test_egern_ipv6_is_not_an_ipv4_match(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "set.yaml"
            path.write_text('# RULES: 1\nip_cidr_set:\n  - "2001:db8::/32"\n')
            with self.assertRaises(ValueError):
                rules.read_rules(path, "Egern")
            path.write_text('# RULES: 1\nno_resolve: true\nip_cidr6_set:\n  - "2001:db8::/32"\n')
            parsed = rules.read_rules(path, "Egern")
            self.assertEqual(parsed[0].flags, ("no-resolve",))

    def test_empty_or_miscounted_rules_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "set.list"
            for text in ['# RULES: 1\n', '# RULES: 2\nDOMAIN,example.com\n']:
                path.write_text(text)
                with self.subTest(text=text), self.assertRaises(ValueError):
                    rules.read_rules(path, "Surge")

    def test_existing_repository_and_service_regressions(self):
        report = rules.audit()
        self.assertEqual(report["files"], 156)
        self.assertGreater(report["fixture_assertions"], 400)
        self.assertEqual(report["problems"], [])


if __name__ == "__main__":
    unittest.main()
