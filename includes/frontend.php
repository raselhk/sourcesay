<?php
/**
 * Front end: display rules, hooks, assets and the no-JS handler.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * Should the survey be shown for this order?
 *
 * @param WC_Order $order   Order.
 * @param string   $context thankyou|account.
 * @return bool
 */
function sourcesay_should_display( $order, $context ) {
	$settings = sourcesay_get_settings();
	$show     = ! empty( $settings['enabled'] );
	if ( $show ) {
		$has = false;
		foreach ( $settings['options'] as $opt ) {
			if ( ! empty( $opt['enabled'] ) ) {
				$has = true;
				break;
			}
		}
		$show = $has;
	}
	if ( $show && in_array( $order->get_status(), array( 'failed', 'cancelled' ), true ) ) {
		$show = false;
	}
	if ( $show && sourcesay_get_response( $order->get_id() ) ) {
		$show = false;
	}
	/**
	 * Filter whether the survey is displayed.
	 *
	 * @param bool     $show    Display flag.
	 * @param WC_Order $order   Order.
	 * @param string   $context Context.
	 */
	return (bool) apply_filters( 'sourcesay_should_display', $show, $order, $context );
}

/**
 * Print the survey for an order.
 *
 * @param WC_Order $order   Order.
 * @param string   $context Context.
 * @return void
 */
function sourcesay_print_survey( $order, $context ) {
	if ( ! function_exists( 'sourcesay_render_survey' ) ) {
		return;
	}
	// After a no-JS submit the response exists, so show the thank-you note instead of the form.
	$thanks = isset( $_GET['sourcesay'] ) && 'thanks' === sanitize_key( wp_unslash( $_GET['sourcesay'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if ( ! $thanks && ! sourcesay_should_display( $order, $context ) ) {
		return;
	}
	echo sourcesay_render_survey( $order, sourcesay_get_settings(), $context ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside the renderer.
}

/**
 * Thank-you page.
 *
 * @param int $order_id Order id.
 * @return void
 */
function sourcesay_thankyou( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( $order ) {
		sourcesay_print_survey( $order, 'thankyou' );
	}
}

/**
 * My Account > View order.
 *
 * @param WC_Order $order Order.
 * @return void
 */
function sourcesay_account( $order ) {
	$settings = sourcesay_get_settings();
	$created  = $order instanceof WC_Order ? $order->get_date_created() : null;
	if ( ! $created || empty( $settings['show_in_account'] ) || ! is_wc_endpoint_url( 'view-order' ) ) {
		return;
	}
	if ( $created->getTimestamp() < time() - 30 * DAY_IN_SECONDS ) {
		return;
	}
	sourcesay_print_survey( $order, 'account' );
}

/**
 * Register the display hooks according to the position setting.
 *
 * @return void
 */
function sourcesay_register_display_hooks() {
	$settings = sourcesay_get_settings();
	add_action( 'woocommerce_thankyou', 'sourcesay_thankyou', 'before' === $settings['position'] ? 5 : 20 );
	add_action( 'woocommerce_order_details_after_order_table', 'sourcesay_account' );
}
add_action( 'init', 'sourcesay_register_display_hooks' );

/**
 * Enqueue survey assets where the survey can appear.
 *
 * @return void
 */
function sourcesay_enqueue_survey_assets() {
	if ( ! function_exists( 'is_order_received_page' ) || ! ( is_order_received_page() || is_wc_endpoint_url( 'view-order' ) ) ) {
		return;
	}
	if ( file_exists( SOURCESAY_PATH . 'assets/css/survey.css' ) ) {
		wp_enqueue_style( 'sourcesay-survey', SOURCESAY_URL . 'assets/css/survey.css', array(), SOURCESAY_VERSION );
	}
	if ( file_exists( SOURCESAY_PATH . 'assets/js/survey.js' ) ) {
		wp_enqueue_script( 'sourcesay-survey', SOURCESAY_URL . 'assets/js/survey.js', array(), SOURCESAY_VERSION, true );
	}
}
add_action( 'wp_enqueue_scripts', 'sourcesay_enqueue_survey_assets' );

/**
 * Process a submitted survey (shared by the no-JS handler and tests).
 *
 * @param array $req Unslashed request data.
 * @return string ok|error
 */
function sourcesay_process_submission( $req ) {
	$order_id = isset( $req['order_id'] ) ? absint( $req['order_id'] ) : 0;
	$key      = isset( $req['order_key'] ) && is_scalar( $req['order_key'] ) ? sanitize_text_field( $req['order_key'] ) : '';
	$order    = $order_id ? wc_get_order( $order_id ) : false;

	if ( sourcesay_rate_limited() ) {
		return 'error';
	}
	if ( ! $order || '' === $key || ! hash_equals( (string) $order->get_order_key(), $key ) ) {
		return 'error';
	}
	if ( ! empty( $req['ss_website'] ) ) {
		return 'ok'; // Honeypot: pretend success, store nothing.
	}
	$result = sourcesay_save_response(
		$order,
		isset( $req['answer_id'] ) && is_scalar( $req['answer_id'] ) ? (string) $req['answer_id'] : '',
		isset( $req['followup_text'] ) && is_scalar( $req['followup_text'] ) ? (string) $req['followup_text'] : '',
		isset( $req['other_text'] ) && is_scalar( $req['other_text'] ) ? (string) $req['other_text'] : '',
		'nojs'
	);
	if ( is_wp_error( $result ) && 'sourcesay_already_answered' !== $result->get_error_code() ) {
		return 'error';
	}
	return 'ok';
}

/**
 * Plain form post fallback for visitors without JavaScript.
 *
 * @return void
 */
function sourcesay_handle_submit() {
	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- public form on cached pages; authenticity is the order key.
	$status = sourcesay_process_submission( wp_unslash( $_POST ) );
	$target = wp_get_referer();
	if ( ! $target ) {
		$order_id = isset( $_POST['order_id'] ) ? absint( $_POST['order_id'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Missing
		$order    = $order_id ? wc_get_order( $order_id ) : false;
		$target   = $order ? $order->get_checkout_order_received_url() : home_url( '/' );
	}
	wp_safe_redirect( add_query_arg( 'sourcesay', 'ok' === $status ? 'thanks' : 'error', remove_query_arg( 'sourcesay', $target ) ) );
	exit;
}
add_action( 'admin_post_sourcesay_submit', 'sourcesay_handle_submit' );
add_action( 'admin_post_nopriv_sourcesay_submit', 'sourcesay_handle_submit' );

/**
 * Per-IP rate limit: 10 submissions per 10 minutes.
 *
 * @return bool True when the caller is over the limit.
 */
function sourcesay_rate_limited() {
	$ip    = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	$key   = 'sourcesay_rl_' . md5( $ip );
	$count = (int) get_transient( $key );
	set_transient( $key, $count + 1, 10 * MINUTE_IN_SECONDS );
	return $count >= 10;
}
