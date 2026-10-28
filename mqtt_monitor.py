"""Read-only MQTT subscription source for the local device test page."""
import uuid
from serial_server import SerialMonitor


class MQTTMonitor(SerialMonitor):
    def __init__(self, host, port=1883, topic='rd-web/test/#', username=None, password=None, tls=False):
        super().__init__()
        self.host, self.port, self.topic = host, port, topic
        self.username, self.password, self.tls = username, password, tls
        self.client = None

    def run(self):
        import paho.mqtt.client as mqtt
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id='rd-web-viewer-' + uuid.uuid4().hex[:12])
        self.client = client
        if self.username:
            client.username_pw_set(self.username, self.password)
        if self.tls:
            client.tls_set()
        client.reconnect_delay_set(min_delay=1, max_delay=10)

        def on_connect(client, userdata, flags, reason_code, properties):
            if reason_code.is_failure:
                self.set_status('error', f'MQTT 连接被拒绝：{reason_code}')
                return
            self.set_status('subscribing')
            result, _ = client.subscribe(self.topic, qos=0)
            if result != mqtt.MQTT_ERR_SUCCESS:
                self.set_status('error', '无法发送订阅请求')

        def on_subscribe(client, userdata, mid, reason_codes, properties):
            if any(code.is_failure for code in reason_codes):
                self.set_status('error', 'Broker 拒绝订阅，请检查 Topic 和权限。')
            else:
                self.set_status('connected')

        def on_message(client, userdata, message):
            from datetime import datetime
            text = message.payload[:8192].decode('utf-8', errors='replace')
            if len(message.payload) > 8192:
                text += '\n[消息超出 8192 字节，显示已截断]'
            with self.lock:
                self.sequence += 1
                self.lines.append({'id': self.sequence, 'time': datetime.now().astimezone().isoformat(timespec='seconds'), 'text': text, 'topic': message.topic, 'retained': message.retain})

        def on_disconnect(client, userdata, flags, reason_code, properties):
            if not self.stop_event.is_set():
                self.set_status('error', f'MQTT 连接已断开，正在自动重连：{reason_code}')

        client.on_connect = on_connect
        client.on_subscribe = on_subscribe
        client.on_message = on_message
        client.on_disconnect = on_disconnect
        client.on_connect_fail = lambda *_: self.set_status('error', '无法连接 MQTT Broker，正在重试。')
        try:
            client.connect_async(self.host, self.port, keepalive=30)
            client.loop_start()
            self.stop_event.wait()
        except (OSError, ValueError) as error:
            self.set_status('error', f'MQTT 配置或连接错误：{error}')
        finally:
            client.disconnect()
            client.loop_stop()

    def snapshot(self, after=0):
        data = super().snapshot(after)
        for key in ('device', 'baudrate'):
            data.pop(key, None)
        data.update(source='mqtt', host=self.host, port=self.port, topic=self.topic, tls=self.tls)
        return data
