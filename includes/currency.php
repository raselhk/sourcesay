<?php
/**
 * Multi-currency: convert an order total to the store base currency.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * Positive float from a meta value, or 0.0 when it is missing or malformed.
 *
 * @param mixed $value Meta value.
 * @return float
 */
function sourcesay_positive_float( $value ) {
	return is_numeric( $value ) && (float) $value > 0 ? (float) $value : 0.0;
}

/**
 * Net order total (total minus refunds) in the store base currency.
 *
 * Detection order: same currency, Aelia, WooPayments, CURCY, WPML/WCML stored rate, then the
 * `sourcesay_order_total_base` filter (default: the net total unchanged).
 *
 * @param WC_Order   $order Order.
 * @param float|null $net   Net total in the order currency (default: computed).
 * @return float
 */
function sourcesay_order_total_base( $order, $net = null ) {
	$net      = null === $net ? sourcesay_net_total( $order ) : (float) $net;
	$total    = (float) $order->get_total();
	$currency = (string) $order->get_currency();
	$base_cur = (string) get_option( 'woocommerce_currency', '' );
	$base     = $net;

	if ( '' === $currency || $currency === $base_cur ) {
		$base = $net;
	} else {
		$base = null;

		// Aelia Currency Switcher: base-currency total, scaled for refunds.
		$aelia = sourcesay_positive_float( $order->get_meta( '_order_total_base_currency' ) );
		if ( $aelia > 0 && $total > 0 ) {
			$base = $aelia * ( $net / $total );
		}

		// WooPayments Multi-Currency: rate = order currency per 1 base currency.
		if ( null === $base ) {
			$rate = sourcesay_positive_float( $order->get_meta( '_wcpay_multi_currency_order_exchange_rate' ) );
			if ( $rate > 0 ) {
				$base = $net / $rate;
			}
		}

		// CURCY / WooCommerce Multi Currency: per-currency info with a rate.
		if ( null === $base ) {
			$info = $order->get_meta( 'wmc_order_info' );
			if ( is_array( $info ) && isset( $info[ $currency ] ) && is_array( $info[ $currency ] ) ) {
				$rate = sourcesay_positive_float( isset( $info[ $currency ]['rate'] ) ? $info[ $currency ]['rate'] : 0 );
				if ( $rate > 0 ) {
					$base = $net / $rate;
				}
			}
		}

		// WPML / WooCommerce Multilingual: stored exchange rate, if any.
		if ( null === $base ) {
			foreach ( array( '_wcml_exchange_rate', '_order_exchange_rate' ) as $key ) {
				$rate = sourcesay_positive_float( $order->get_meta( $key ) );
				if ( $rate > 0 ) {
					$base = $net / $rate;
					break;
				}
			}
		}

		if ( null === $base ) {
			$base = $net;
		}
	}

	/**
	 * Filter the order net total expressed in the store base currency.
	 *
	 * @param float    $base  Converted value.
	 * @param WC_Order $order Order.
	 */
	return round( (float) apply_filters( 'sourcesay_order_total_base', $base, $order ), 4 );
}
