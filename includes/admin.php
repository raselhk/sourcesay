<?php
/**
 * Admin page: submenu, assets, app root.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register the submenu under WooCommerce.
 *
 * @return void
 */
function sourcesay_admin_menu() {
	$hook = add_submenu_page(
		'woocommerce',
		__( 'SourceSay', 'sourcesay' ),
		__( 'SourceSay', 'sourcesay' ),
		'manage_woocommerce',
		'sourcesay',
		'sourcesay_render_admin_page'
	);
	if ( $hook ) {
		$GLOBALS['sourcesay_admin_hook'] = $hook;
	}
}
add_action( 'admin_menu', 'sourcesay_admin_menu', 99 );

/**
 * Print the app root only; the UI is built by admin.js.
 *
 * @return void
 */
function sourcesay_render_admin_page() {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		return;
	}
	echo '<div id="sourcesay-app" class="sourcesay ss-app"><noscript>' . esc_html__( 'SourceSay needs JavaScript enabled to show its reports and settings.', 'sourcesay' ) . '</noscript></div>';
}

/**
 * Human labels for WooCommerce order attribution source types.
 *
 * @return array
 */
function sourcesay_wc_source_labels() {
	return array(
		'utm'        => __( 'Campaign (UTM)', 'sourcesay' ),
		'organic'    => __( 'Organic search', 'sourcesay' ),
		'referral'   => __( 'Referral', 'sourcesay' ),
		'typein'     => __( 'Direct', 'sourcesay' ),
		'admin'      => __( 'Web admin', 'sourcesay' ),
		'mobile_app' => __( 'Mobile app', 'sourcesay' ),
		'pos'        => __( 'Point of sale', 'sourcesay' ),
		'unknown'    => __( 'Unknown', 'sourcesay' ),
	);
}

/**
 * Orders list URL for the active order storage.
 *
 * @return string
 */
function sourcesay_orders_url() {
	if ( class_exists( '\Automattic\WooCommerce\Utilities\OrderUtil' ) && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled() ) {
		return admin_url( 'admin.php?page=wc-orders' );
	}
	return admin_url( 'edit.php?post_type=shop_order' );
}

/**
 * Enqueue admin assets on the SourceSay screen only.
 *
 * @param string $hook Current admin hook suffix.
 * @return void
 */
function sourcesay_admin_assets( $hook ) {
	if ( empty( $GLOBALS['sourcesay_admin_hook'] ) || $hook !== $GLOBALS['sourcesay_admin_hook'] ) {
		return;
	}
	if ( file_exists( SOURCESAY_PATH . 'assets/css/admin.css' ) ) {
		wp_enqueue_style( 'sourcesay-admin', SOURCESAY_URL . 'assets/css/admin.css', array(), SOURCESAY_VERSION );
	}
	if ( ! file_exists( SOURCESAY_PATH . 'assets/js/admin.js' ) ) {
		return;
	}
	wp_enqueue_script( 'sourcesay-admin', SOURCESAY_URL . 'assets/js/admin.js', array( 'wp-i18n', 'wp-api-fetch' ), SOURCESAY_VERSION, true );
	wp_set_script_translations( 'sourcesay-admin', 'sourcesay' );
	wp_localize_script(
		'sourcesay-admin',
		'sourcesayAdmin',
		array(
			'restNamespace'  => 'sourcesay/v1',
			'exportUrl'      => add_query_arg(
				array(
					'action'   => 'sourcesay_export',
					'_wpnonce' => wp_create_nonce( 'sourcesay_export' ),
				),
				admin_url( 'admin-post.php' )
			),
			'ordersUrl'      => sourcesay_orders_url(),
			'icons'          => SOURCESAY_URL . 'assets/icons.svg',
			'version'        => SOURCESAY_VERSION,
			'wcSourceLabels' => sourcesay_wc_source_labels(),
		)
	);
}
add_action( 'admin_enqueue_scripts', 'sourcesay_admin_assets' );

/**
 * "Reports" link on the plugins list.
 *
 * @param array $links Action links.
 * @return array
 */
function sourcesay_action_links( $links ) {
	array_unshift( $links, '<a href="' . esc_url( admin_url( 'admin.php?page=sourcesay#settings' ) ) . '">' . esc_html__( 'Settings', 'sourcesay' ) . '</a>' );
	return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( SOURCESAY_FILE ), 'sourcesay_action_links' );
