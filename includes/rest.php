<?php
/**
 * REST API (namespace sourcesay/v1).
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register the routes.
 *
 * @return void
 */
function sourcesay_register_routes() {
	register_rest_route(
		'sourcesay/v1',
		'/response',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'sourcesay_rest_response',
			'permission_callback' => 'sourcesay_rest_response_permission',
		)
	);
	register_rest_route(
		'sourcesay/v1',
		'/admin/settings',
		array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => 'sourcesay_rest_get_settings',
				'permission_callback' => 'sourcesay_rest_admin_permission',
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'sourcesay_rest_save_settings',
				'permission_callback' => 'sourcesay_rest_admin_permission',
			),
		)
	);
	register_rest_route(
		'sourcesay/v1',
		'/admin/report',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'sourcesay_rest_report',
			'permission_callback' => 'sourcesay_rest_admin_permission',
		)
	);
	$admin_routes = array(
		'/admin/status'      => array( WP_REST_Server::READABLE, 'sourcesay_rest_status' ),
		'/admin/setup-done'  => array( WP_REST_Server::CREATABLE, 'sourcesay_rest_setup_done' ),
		'/admin/test-order'  => array( WP_REST_Server::CREATABLE, 'sourcesay_rest_test_order' ),
		'/admin/test-orders' => array( WP_REST_Server::DELETABLE, 'sourcesay_rest_delete_test_orders' ),
	);
	foreach ( $admin_routes as $route => $def ) {
		register_rest_route(
			'sourcesay/v1',
			$route,
			array(
				'methods'             => $def[0],
				'callback'            => $def[1],
				'permission_callback' => 'sourcesay_rest_admin_permission',
			)
		);
	}
}
add_action( 'rest_api_init', 'sourcesay_register_routes' );

/**
 * Admin routes permission.
 *
 * @return bool
 */
function sourcesay_rest_admin_permission() {
	return current_user_can( 'manage_woocommerce' );
}

/**
 * Public route permission: rate limit, then the order key.
 *
 * @param WP_REST_Request $request Request.
 * @return true|WP_Error
 */
function sourcesay_rest_response_permission( $request ) {
	if ( sourcesay_rate_limited() ) {
		return new WP_Error( 'sourcesay_rate_limited', __( 'Too many requests. Please try again later.', 'sourcesay' ), array( 'status' => 429 ) );
	}
	$order = wc_get_order( absint( $request->get_param( 'order_id' ) ) );
	$key   = $request->get_param( 'order_key' );
	if ( ! $order || ! is_string( $key ) || '' === $key || ! hash_equals( (string) $order->get_order_key(), $key ) ) {
		return new WP_Error( 'sourcesay_forbidden', __( 'Invalid order.', 'sourcesay' ), array( 'status' => 403 ) );
	}
	return true;
}

/**
 * Store a response.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function sourcesay_rest_response( $request ) {
	$settings = sourcesay_get_settings();
	$ok       = new WP_REST_Response(
		array(
			'ok'      => true,
			'message' => $settings['thank_you'],
		),
		200
	);

	if ( '' !== (string) $request->get_param( 'ss_website' ) ) {
		return $ok;
	}
	$order  = wc_get_order( absint( $request->get_param( 'order_id' ) ) );
	$result = sourcesay_save_response(
		$order,
		(string) $request->get_param( 'answer_id' ),
		(string) $request->get_param( 'followup_text' ),
		(string) $request->get_param( 'other_text' ),
		in_array( $request->get_param( 'context' ), array( 'thankyou', 'account' ), true ) ? $request->get_param( 'context' ) : 'thankyou'
	);
	return is_wp_error( $result ) ? $result : $ok;
}

/**
 * GET settings.
 *
 * @return WP_REST_Response
 */
function sourcesay_rest_get_settings() {
	return new WP_REST_Response(
		array(
			'settings' => sourcesay_get_settings(),
			'presets'  => sourcesay_presets(),
			'icons'    => sourcesay_icon_keys(),
		)
	);
}

/**
 * POST settings.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function sourcesay_rest_save_settings( $request ) {
	$raw = $request->get_param( 'settings' );
	if ( ! is_array( $raw ) ) {
		return new WP_Error( 'sourcesay_bad_request', __( 'Missing settings.', 'sourcesay' ), array( 'status' => 400 ) );
	}
	$clean = sourcesay_sanitize_settings( $raw );
	update_option( 'sourcesay_settings', $clean, 'yes' );
	sourcesay_flush_report_cache();
	return new WP_REST_Response( array( 'settings' => sourcesay_get_settings() ) );
}

/**
 * GET report.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response
 */
function sourcesay_rest_report( $request ) {
	return new WP_REST_Response( sourcesay_get_report( (string) $request->get_param( 'from' ), (string) $request->get_param( 'to' ) ) );
}

/**
 * Known caching plugins: basename => [ name, where to exclude the page ].
 *
 * @return array
 */
function sourcesay_caching_plugins() {
	return array(
		'wp-rocket/wp-rocket.php'                    => array( 'WP Rocket', 'Settings > WP Rocket > Advanced Rules > "Never Cache URL(s)"' ),
		'litespeed-cache/litespeed-cache.php'        => array( 'LiteSpeed Cache', 'LiteSpeed Cache > Cache > Excludes > "Do Not Cache URIs"' ),
		'w3-total-cache/w3-total-cache.php'          => array( 'W3 Total Cache', 'Performance > Page Cache > "Never cache the following pages"' ),
		'wp-super-cache/wp-cache.php'                => array( 'WP Super Cache', 'Settings > WP Super Cache > Advanced > "Accepted Filenames & Rejected URIs"' ),
		'sg-cachepress/sg-cachepress.php'            => array( 'SiteGround Optimizer', 'SiteGround Optimizer > Caching > "Exclude URLs from caching"' ),
		'hummingbird-performance/wp-hummingbird.php' => array( 'Hummingbird', 'Hummingbird > Caching > Page Caching > Exclusions' ),
		'wp-fastest-cache/wpFastestCache.php'        => array( 'WP Fastest Cache', 'WP Fastest Cache > Exclude > "Add New Rule"' ),
		'breeze/breeze.php'                          => array( 'Breeze', 'Breeze > Advanced Options > "Never Cache URLs"' ),
	);
}

/**
 * Build the status payload for the admin status card.
 *
 * @return array
 */
function sourcesay_get_status() {
	global $wpdb;
	$settings = sourcesay_get_settings();
	$problems = array();

	if ( empty( $settings['enabled'] ) ) {
		$problems[] = array(
			'code'    => 'disabled',
			'message' => __( 'The survey is switched off, so customers will not see it. Fix: open the Survey tab and turn on "Show the survey after checkout".', 'sourcesay' ),
		);
	}
	$enabled_options = 0;
	foreach ( $settings['options'] as $opt ) {
		if ( ! empty( $opt['enabled'] ) ) {
			++$enabled_options;
		}
	}
	if ( 0 === $enabled_options ) {
		$problems[] = array(
			'code'    => 'no_options',
			'message' => __( 'Every answer option is switched off, so there is nothing to show. Fix: open the Survey tab and turn on at least one answer.', 'sourcesay' ),
		);
	}
	if ( ! function_exists( 'sourcesay_render_survey' ) ) {
		$problems[] = array(
			'code'    => 'missing_view',
			'message' => __( 'A plugin file is missing, so the survey cannot be drawn. Fix: reinstall SourceSay from the Plugins screen.', 'sourcesay' ),
		);
	}

	$caching = null;
	$active  = (array) get_option( 'active_plugins', array() );
	foreach ( sourcesay_caching_plugins() as $file => $info ) {
		if ( in_array( $file, $active, true ) ) {
			$caching    = $info[0];
			$path       = trailingslashit( (string) wp_parse_url( wc_get_checkout_url(), PHP_URL_PATH ) ) . get_option( 'woocommerce_checkout_order_received_endpoint', 'order-received' ) . '/*';
			$problems[] = array(
				'code'    => 'caching_plugin',
				/* translators: 1: caching plugin name, 2: URL path, 3: where the setting lives. */
				'message' => sprintf( __( '%1$s is active. If it stores a copy of your order confirmation page, customers could see a stale page without the survey. Fix: exclude %2$s from caching in %3$s.', 'sourcesay' ), $info[0], $path, $info[1] ),
			);
			break;
		}
	}

	$checkout_type = 'unknown';
	$page_id       = function_exists( 'wc_get_page_id' ) ? wc_get_page_id( 'checkout' ) : 0;
	$content       = $page_id > 0 ? (string) get_post_field( 'post_content', $page_id ) : '';
	if ( '' !== $content ) {
		if ( has_block( 'woocommerce/checkout', $content ) ) {
			$checkout_type = 'block';
		} elseif ( has_shortcode( $content, 'woocommerce_checkout' ) ) {
			$checkout_type = 'classic';
		}
	}

	$table = sourcesay_table();
	$total = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE is_test = 0" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery
	$last  = $wpdb->get_var( "SELECT MAX(created_at) FROM {$table} WHERE is_test = 0" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery
	$tresp = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE is_test = 1" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery
	$rep   = sourcesay_get_report();
	$tests = wc_get_orders(
		array(
			'status'     => array_keys( wc_get_order_statuses() ),
			'meta_key'   => '_sourcesay_test', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			'meta_value' => '1', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
			'limit'      => 1,
			'paginate'   => true,
			'return'     => 'ids',
		)
	);

	return array(
		'survey_live'       => empty( $problems ) || ! array_diff( wp_list_pluck( $problems, 'code' ), array( 'caching_plugin' ) ),
		'problems'          => $problems,
		'checkout_type'     => $checkout_type,
		'theme'             => wp_get_theme()->get( 'Name' ),
		'caching_plugin'    => $caching,
		'responses_total'   => $total,
		'last_response_at'  => $last ? wp_date( 'c', strtotime( $last . ' UTC' ) ) : null,
		'paid_orders_30d'   => $rep['totals']['paid_orders'],
		'response_rate_30d' => $rep['totals']['response_rate'],
		'setup_done'        => (bool) get_option( 'sourcesay_setup_done', 0 ),
		'test_orders'       => (int) $tests->total,
		'test_responses'    => $tresp,
	);
}

/**
 * GET status.
 *
 * @return WP_REST_Response
 */
function sourcesay_rest_status() {
	return new WP_REST_Response( sourcesay_get_status() );
}

/**
 * POST setup-done.
 *
 * @return WP_REST_Response
 */
function sourcesay_rest_setup_done() {
	update_option( 'sourcesay_setup_done', 1 );
	return new WP_REST_Response( array( 'ok' => true ) );
}

/**
 * Create a pending test order for the current admin.
 *
 * @return WP_REST_Response|WP_Error
 */
function sourcesay_create_test_order() {
	add_filter( 'pre_wp_mail', '__return_true' );
	$user  = wp_get_current_user();
	$order = wc_create_order(
		array(
			'customer_id' => $user->ID,
			'status'      => 'pending',
			'created_via' => 'sourcesay-test',
		)
	);
	if ( is_wp_error( $order ) ) {
		remove_filter( 'pre_wp_mail', '__return_true' );
		return $order;
	}
	$product = null;
	foreach ( wc_get_products(
		array(
			'status' => 'publish',
			'limit'  => 20,
		)
	) as $candidate ) {
		if ( $candidate->is_purchasable() && $candidate->is_in_stock() && ! $candidate->is_type( array( 'variable', 'grouped', 'external' ) ) ) {
			$product = $candidate;
			break;
		}
	}
	if ( $product ) {
		$order->add_product( $product, 1 );
	} else {
		$fee = new WC_Order_Item_Fee();
		$fee->set_name( __( 'SourceSay test item', 'sourcesay' ) );
		$fee->set_total( 10 );
		$order->add_item( $fee );
	}
	$order->set_billing_email( $user->user_email );
	$order->update_meta_data( '_sourcesay_test', 1 );
	$order->calculate_totals( false );
	$order->add_order_note( __( 'Test order created by SourceSay', 'sourcesay' ) );
	$order->save();
	remove_filter( 'pre_wp_mail', '__return_true' );

	return new WP_REST_Response(
		array(
			'order_id' => $order->get_id(),
			'url'      => $order->get_checkout_order_received_url(),
		)
	);
}

/**
 * POST test-order.
 *
 * @return WP_REST_Response|WP_Error
 */
function sourcesay_rest_test_order() {
	return sourcesay_create_test_order();
}

/**
 * Delete test orders and their responses.
 *
 * @return int Orders deleted.
 */
function sourcesay_delete_test_orders() {
	global $wpdb;
	$deleted = 0;
	$ids     = wc_get_orders(
		array(
			'status'     => array_keys( wc_get_order_statuses() ),
			'meta_key'   => '_sourcesay_test', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			'meta_value' => '1', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
			'limit'      => -1,
			'return'     => 'ids',
		)
	);
	foreach ( $ids as $id ) {
		$wpdb->delete( sourcesay_table(), array( 'order_id' => (int) $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$order = wc_get_order( $id );
		if ( $order && $order->delete( true ) ) {
			++$deleted;
		}
	}
	$wpdb->delete( sourcesay_table(), array( 'is_test' => 1 ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	sourcesay_flush_report_cache();
	return $deleted;
}

/**
 * DELETE test-orders.
 *
 * @return WP_REST_Response
 */
function sourcesay_rest_delete_test_orders() {
	return new WP_REST_Response( array( 'deleted' => sourcesay_delete_test_orders() ) );
}
