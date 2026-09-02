# LongShortProbabilityStrategy
#
# A FreqAI-enabled freqtrade strategy that trains a binary classifier
# (up vs. down over the next N candles) and exposes its class probability
# as a long/short bias signal. This is the real counterpart to the
# simulated data served by /server in this repo: point freqtrade's REST
# API at the mobile app (see /freqtrade/README.md) and the app switches
# from mock predictions to this model's live output with no frontend
# changes needed — both speak the same {pair, up_probability, direction}
# shape.
#
# Requires freqtrade with FreqAI enabled (pip install freqtrade[freqai]
# plus a classifier backend, e.g. lightgbm). See config.json.example for
# the matching `freqai` config block.
#
# This strategy does NOT place trades based on the probability by itself
# in this repo — entry/exit thresholds below are a reasonable starting
# point, but tune and backtest extensively before ever running with
# real funds (start with dry_run: true).

from functools import reduce

import pandas as pd
import talib.abstract as ta
from pandas import DataFrame

from freqtrade.strategy import IStrategy, DecimalParameter


class LongShortProbabilityStrategy(IStrategy):
    INTERFACE_VERSION = 3

    # Binance USDT-M futures supports both directions; on spot markets
    # can_short must stay False and "short" bias is informational only
    # (i.e. "avoid longing" rather than an executable short).
    can_short = True

    timeframe = "15m"
    process_only_new_candles = True
    startup_candle_count = 200

    minimal_roi = {"0": 0.05}
    stoploss = -0.05

    # Probability thresholds for turning the FreqAI signal into an entry.
    long_threshold = DecimalParameter(0.55, 0.85, default=0.65, space="buy")
    short_threshold = DecimalParameter(0.55, 0.85, default=0.65, space="sell")

    def feature_engineering_expand_all(self, dataframe: DataFrame, period: int, **kwargs) -> DataFrame:
        """Features FreqAI will expand across configured timeframes/periods."""
        dataframe["%-rsi"] = ta.RSI(dataframe, timeperiod=period)
        dataframe["%-ema"] = ta.EMA(dataframe, timeperiod=period)
        dataframe["%-volume_z"] = (
            dataframe["volume"] - dataframe["volume"].rolling(period).mean()
        ) / dataframe["volume"].rolling(period).std()
        return dataframe

    def feature_engineering_expand_basic(self, dataframe: DataFrame, **kwargs) -> DataFrame:
        macd = ta.MACD(dataframe)
        dataframe["%-macd_hist"] = macd["macdhist"]

        bollinger = ta.BBANDS(dataframe, timeperiod=20)
        dataframe["%-bb_percent"] = (dataframe["close"] - bollinger["lowerband"]) / (
            bollinger["upperband"] - bollinger["lowerband"]
        )

        ema_fast = ta.EMA(dataframe, timeperiod=12)
        ema_slow = ta.EMA(dataframe, timeperiod=26)
        dataframe["%-ema_fast_slow_delta"] = (ema_fast - ema_slow) / dataframe["close"]
        return dataframe

    def feature_engineering_standard(self, dataframe: DataFrame, **kwargs) -> DataFrame:
        dataframe["%-hour_of_day"] = dataframe["date"].dt.hour
        return dataframe

    def set_freqai_targets(self, dataframe: DataFrame, **kwargs) -> DataFrame:
        """
        Binary classification target: does price close higher `label_period_candles`
        candles from now than it is today? FreqAI reports the model's predicted
        class probabilities as `up_or_down_up` / `up_or_down_down` columns, which
        this strategy re-exposes to the app as up_probability / down_probability.
        """
        label_period = self.freqai_info.get("feature_parameters", {}).get("label_period_candles", 12)
        future_close = dataframe["close"].shift(-label_period)
        dataframe["&-up_or_down"] = (future_close > dataframe["close"]).map({True: "up", False: "down"})
        return dataframe

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe = self.freqai.start(dataframe, metadata, self)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        long_conditions = [
            dataframe["do_predict"] == 1,
            dataframe["up_or_down_up"] > self.long_threshold.value,
            dataframe["volume"] > 0,
        ]
        dataframe.loc[reduce(lambda a, b: a & b, long_conditions), ["enter_long", "enter_tag"]] = (
            1,
            "freqai_long",
        )

        short_conditions = [
            dataframe["do_predict"] == 1,
            dataframe["up_or_down_down"] > self.short_threshold.value,
            dataframe["volume"] > 0,
        ]
        dataframe.loc[reduce(lambda a, b: a & b, short_conditions), ["enter_short", "enter_tag"]] = (
            1,
            "freqai_short",
        )
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[dataframe["do_predict"] == 1, "exit_long"] = (
            dataframe["up_or_down_down"] > self.long_threshold.value
        ).astype(int)
        dataframe.loc[dataframe["do_predict"] == 1, "exit_short"] = (
            dataframe["up_or_down_up"] > self.short_threshold.value
        ).astype(int)
        return dataframe
