import importlib.util
import ipaddress
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from validate_rules import Rule, CLIENTS, GROUPS, read_rules, matches
from optimize_rules import compact, optimize, plan


class OfficialOptimization(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.policy = json.loads((ROOT / 'tools/official-routing-policy.json').read_text())

    def test_domain_compaction_preserves_label_boundaries(self):
        original = [Rule('DOMAIN', 'cdn.example.com'), Rule('DOMAIN-SUFFIX', 'example.com'),
                    Rule('DOMAIN-SUFFIX', 'deep.example.com'), Rule('DOMAIN', 'notexample.com')]
        result, certificates = compact(original)
        self.assertEqual(len(certificates), 2)
        for host in ['example.com', 'cdn.example.com', 'deep.example.com', 'a.deep.example.com',
                     'notexample.com', 'example.com.invalid', 'unrelated.invalid']:
            self.assertEqual(any(matches(r, {'host': host}) for r in original),
                             any(matches(r, {'host': host}) for r in result))

    def test_network_compaction_requires_same_resolution_behavior(self):
        parent = Rule('IP-CIDR', '192.0.2.0/24', ('no-resolve',))
        child = Rule('IP-CIDR', '192.0.2.128/25', ('no-resolve',))
        resolving = Rule('IP-CIDR', '192.0.2.0/25')
        result, certificates = compact([parent, child, resolving])
        self.assertEqual(result, [parent, resolving])
        self.assertEqual(len(certificates), 1)
        for ip in ['192.0.2.0', '192.0.2.127', '192.0.2.128', '192.0.2.255', '192.0.3.0']:
            self.assertEqual(any(matches(r, {'ip': ip}) for r in [parent, child, resolving]),
                             any(matches(r, {'ip': ip}) for r in result))

    def test_compaction_never_broadens_adjacent_ranges(self):
        original = [Rule('IP-CIDR', '192.0.2.0/25'), Rule('IP-CIDR', '192.0.2.128/26')]
        self.assertEqual(compact(original)[0], original)

    def test_all_official_netflix_domain_roots_remain(self):
        rules = read_rules(ROOT / 'Loon/rule/Netflix.lsr', 'Loon')
        for host in self.policy['netflix']['official_domain_feed']:
            self.assertTrue(any(matches(rule, {'host': host}) for rule in rules), host)
            self.assertTrue(any(matches(rule, {'host': 'probe.' + host}) for rule in rules), host)

    def test_netflix_networks_exactly_match_reviewed_registry_objects(self):
        rules = read_rules(ROOT / 'Loon/rule/Netflix.lsr', 'Loon')
        actual = {r.value for r in rules if r.kind in {'IP-CIDR', 'IP-CIDR6'}}
        expected = {x['cidr'] for x in self.policy['netflix']['verified_existing_networks']}
        self.assertTrue(actual == expected, f"unreviewed={len(actual - expected)}, missing={len(expected - actual)}")
        for x in self.policy['netflix']['verified_existing_networks']:
            self.assertTrue(x['registry_url'].startswith(('https://rdap.arin.net/', 'https://rdap.db.ripe.net/')))
            self.assertEqual(len(x['response_sha256']), 64)

    def test_no_unbounded_domain_keywords_remain_in_any_client(self):
        for client, ext in CLIENTS.items():
            for group in GROUPS:
                with self.subTest(client=client, group=group):
                    self.assertFalse(any(r.kind == 'DOMAIN-KEYWORD' for r in read_rules(ROOT/client/'rule'/(group+ext), client)))

    def test_qx_uses_native_ip_vocabulary_without_foreign_options(self):
        for group in GROUPS:
            for rule in read_rules(ROOT/'QuantumultX/rule'/(group+'.list'), 'QuantumultX'):
                self.assertEqual(rule.flags, ())
                self.assertNotIn(rule.kind, {'SRC-PORT', 'AND', 'PROCESS-NAME'})

    def test_reviewed_shared_roots_are_absent(self):
        for item in self.policy['remove_matchers']:
            rules = read_rules(ROOT/'Loon/rule'/(item['group']+'.lsr'), 'Loon')
            self.assertFalse(any((r.kind, r.value) == (item['kind'], item['value']) for r in rules), item['group'] + ': ' + item['value'])

    def test_shadowrocket_preserves_legacy_asn_option_shape(self):
        for group in GROUPS:
            for rule in read_rules(ROOT/'Shadowrocket/rule'/(group+'.list'), 'Shadowrocket'):
                if rule.kind == 'IP-ASN':
                    self.assertEqual(rule.flags, ())

    def test_service_networks_equal_the_reviewed_first_party_inventory(self):
        for group, approved in self.policy['reviewed_service_networks'].items():
            expected = {(item['kind'], item['value']) for item in approved}
            for client, ext in CLIENTS.items():
                rules = read_rules(ROOT/client/'rule'/(group+ext), client)
                actual = {(r.kind, r.value) for r in rules if r.kind in {'IP-CIDR', 'IP-CIDR6', 'IP-ASN'}}
                self.assertEqual(actual, expected, client + '/' + group)

    def test_telegram_feed_is_preserved_without_expanding_the_listed_prefixes(self):
        rules = read_rules(ROOT/'Loon/rule/Telegram.lsr', 'Loon')
        actual = {r.value for r in rules if r.kind in {'IP-CIDR', 'IP-CIDR6'}}
        self.assertEqual(actual, set(self.policy['telegram']['official_cidrs']) |
                         {self.policy['telegram']['retained_registered_network']})

    def test_policy_is_idempotent_and_does_not_reformat_unchanged_files(self):
        edits, _ = plan()
        self.assertFalse(edits, str(len(edits)) + ' files still need optimization')


if __name__ == '__main__':
    unittest.main()
