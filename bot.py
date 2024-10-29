import json
import time
from datetime import datetime
import urllib.request

class CryptoBot:
    def __init__(self):
        self.base_url = "https://api.binance.com/api/v3"
        self.pairs = ["BTCUSDT", "ETHUSDT"]
        self.interval = 60  # seconds

    def get_price(self, symbol):
        try:
            url = f"{self.base_url}/ticker/price?symbol={symbol}"
            with urllib.request.urlopen(url) as response:
                data = json.loads(response.read())
                return float(data['price'])
        except Exception as e:
            print(f"Error fetching price: {e}")
            return None

    def analyze_market(self, symbol, price):
        # Simple example strategy - you can enhance this
        print(f"{datetime.now()}: {symbol} price: ${price:.2f}")

    def run(self):
        print("Starting crypto bot...")
        while True:
            for pair in self.pairs:
                price = self.get_price(pair)
                if price:
                    self.analyze_market(pair, price)
            time.sleep(self.interval)

if __name__ == "__main__":
    bot = CryptoBot()
    bot.run()