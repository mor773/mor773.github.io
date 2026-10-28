#!/usr/bin/env python3
"""Local MQTT broker for the ESP8266 WiFi test (no cloud required)."""
import argparse
import asyncio
from amqtt.broker import Broker


async def run(bind, port):
    broker = Broker({
        'listeners': {'default': {'type': 'tcp', 'bind': f'{bind}:{port}'}},
        'plugins': {'amqtt.plugins.authentication.AnonymousAuthPlugin': {'allow_anonymous': True}},
    })
    await broker.start()
    print(f'本地 MQTT 测试 Broker 已启动：{bind}:{port}', flush=True)
    try:
        await asyncio.Event().wait()
    finally:
        await broker.shutdown()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bind', default='0.0.0.0')
    parser.add_argument('--port', default=1883, type=int)
    args = parser.parse_args()
    try:
        asyncio.run(run(args.bind, args.port))
    except KeyboardInterrupt:
        pass
