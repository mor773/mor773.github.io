"""Exercise API routing without opening real serial ports or MQTT connections."""
import io
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from serial_server import Handler


class Monitor:
    def __init__(self, source):
        self.source = source
        self.started = False

    def start(self):
        self.started = True

    def snapshot(self, after):
        return {'source': self.source, 'total': 0, 'lines': [], 'after': after}


class LocalAPITest(unittest.TestCase):
    def request(self, path, host='127.0.0.1:8002', origin=None):
        handler = Handler.__new__(Handler)
        handler.path = path
        handler.headers = {'Host': host}
        if origin:
            handler.headers['Origin'] = origin
        handler.server = type('Server', (), {'server_port': 8002})()
        handler.monitors = {'usb': Monitor('serial'), 'mqtt': Monitor('mqtt')}
        handler.directory = str(Path(__file__).resolve().parents[1])
        handler.wfile = io.BytesIO()
        handler.send_error = lambda code, *args: setattr(handler, 'result', code)
        handler.send_response = lambda code: setattr(handler, 'result', code)
        handler.send_header = lambda *args: None
        handler.end_headers = lambda: None
        handler.do_GET()
        return handler

    def test_usb_source(self):
        h = self.request('/api/messages?source=usb&after=12')
        self.assertEqual(h.result, 200)
        self.assertTrue(h.monitors['usb'].started)
        self.assertFalse(h.monitors['mqtt'].started)
        self.assertIn(b'"after": 12', h.wfile.getvalue())

    def test_mqtt_source(self):
        h = self.request('/api/messages?source=mqtt')
        self.assertTrue(h.monitors['mqtt'].started)
        self.assertFalse(h.monitors['usb'].started)

    def test_legacy_usb(self):
        self.assertTrue(self.request('/api/serial').monitors['usb'].started)

    def test_invalid_inputs(self):
        for url in ['/api/messages?source=invalid', '/api/messages?after=no']:
            self.assertEqual(self.request(url).result, 400)

    def test_origin_restrictions(self):
        self.assertEqual(self.request('/api/messages', host='evil.example').result, 403)
        self.assertEqual(self.request('/api/messages', origin='https://evil.example').result, 403)

    def test_private_files(self):
        for url in ['/.git/config', '/firmware/wifi_mqtt_test/secrets.h', '/serial_server.py', '/content/companies/../../users.json']:
            self.assertEqual(self.request(url).result, 404)


if __name__ == '__main__':
    unittest.main()
