<?php
/**
 * Shortcode [sourcesay] and the dynamic block sourcesay/survey.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * First non-empty scalar from the query string.
 *
 * @param string[] $keys Query keys, in priority order.
 * @return string
 */
function sourcesay_get_param( $keys ) {
	foreach ( $keys as $key ) {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- read-only; the order key is the credential.
		$value = isset( $_GET[ $key ] ) && is_scalar( $_GET[ $key ] ) ? sanitize_text_field( wp_unslash( (string) $_GET[ $key ] ) ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Recommended
		if ( '' !== $value ) {
			return $value;
		}
	}
	return '';
}

/**
 * Find the order of a custom thank-you page. The order key in the URL must match.
 *
 * Order id: shortcode attribute, query var `order-received`, then GET order_id / order / wcf-order / order-id.
 * Order key: GET key / order_key / wcf-key (CartFlows, FunnelKit and the WooCommerce default).
 *
 * @param int $order_id Order id from the shortcode attribute, or 0.
 * @return WC_Order|null
 */
function sourcesay_detect_order( $order_id = 0 ) {
	$id = absint( $order_id );
	if ( ! $id ) {
		$id = absint( get_query_var( 'order-received' ) );
	}
	if ( ! $id ) {
		$id = absint( sourcesay_get_param( array( 'order_id', 'order', 'wcf-order', 'order-id' ) ) );
	}
	$key = sourcesay_get_param( array( 'key', 'order_key', 'wcf-key' ) );
	if ( ! $id || '' === $key || ! function_exists( 'wc_get_order' ) ) {
		return null;
	}
	$order = wc_get_order( $id );
	if ( ! $order instanceof WC_Order || ! hash_equals( (string) $order->get_order_key(), $key ) ) {
		return null;
	}
	return $order;
}

/**
 * Shortcode and block output.
 *
 * @param array|string $atts Shortcode attributes.
 * @return string
 */
function sourcesay_shortcode( $atts = array() ) {
	$atts  = shortcode_atts( array( 'order_id' => 0 ), is_array( $atts ) ? $atts : array(), 'sourcesay' );
	$order = sourcesay_detect_order( $atts['order_id'] );
	if ( ! $order ) {
		return '';
	}
	$html = sourcesay_survey_html( $order, 'thankyou' );
	if ( '' !== $html ) {
		sourcesay_enqueue_survey_assets( true );
	}
	return $html;
}
add_shortcode( 'sourcesay', 'sourcesay_shortcode' );

/**
 * Register the block and its editor script handle.
 *
 * @return void
 */
function sourcesay_register_block() {
	$has_js = file_exists( SOURCESAY_PATH . 'assets/js/block.js' );
	wp_register_script(
		'sourcesay-block-editor',
		$has_js ? SOURCESAY_URL . 'assets/js/block.js' : false,
		array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-i18n', 'wp-components' ),
		SOURCESAY_VERSION,
		true
	);
	if ( $has_js ) {
		wp_set_script_translations( 'sourcesay-block-editor', 'sourcesay' );
	}
	if ( file_exists( SOURCESAY_PATH . 'blocks/survey/block.json' ) ) {
		register_block_type(
			SOURCESAY_PATH . 'blocks/survey',
			array(
				'render_callback' => static function () {
					return sourcesay_shortcode( array() );
				},
			)
		);
	}
}
add_action( 'init', 'sourcesay_register_block' );
