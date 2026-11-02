<?php
/**
 * Plugin Name:       SourceSay
 * Plugin URI:        https://swiftwebdev.com/sourcesay/
 * Description:       Ask customers how they found you right after checkout and see which channels bring revenue.
 * Version:           1.0.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Requires Plugins:  woocommerce
 * Author:            SwiftWebDev
 * Author URI:        https://swiftwebdev.com/
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       sourcesay
 * Domain Path:       /languages
 * WC requires at least: 8.5
 * WC tested up to:   10.3
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

define( 'SOURCESAY_VERSION', '1.0.0' );
define( 'SOURCESAY_FILE', __FILE__ );
define( 'SOURCESAY_PATH', plugin_dir_path( __FILE__ ) );
define( 'SOURCESAY_URL', plugin_dir_url( __FILE__ ) );
define( 'SOURCESAY_DB_VERSION', 1 );

foreach ( array( 'install', 'settings', 'responses', 'frontend', 'rest', 'reports', 'export', 'admin', 'orders-ui', 'privacy', 'cron' ) as $sourcesay_file ) {
	require_once SOURCESAY_PATH . 'includes/' . $sourcesay_file . '.php';
}
unset( $sourcesay_file );

// The survey markup is owned by view-survey.php; the plugin must not fatal without it.
if ( file_exists( SOURCESAY_PATH . 'includes/view-survey.php' ) ) {
	require_once SOURCESAY_PATH . 'includes/view-survey.php';
}

register_activation_hook( SOURCESAY_FILE, 'sourcesay_activate' );
register_deactivation_hook( SOURCESAY_FILE, 'sourcesay_deactivate' );

add_action(
	'before_woocommerce_init',
	static function () {
		if ( class_exists( '\Automattic\WooCommerce\Utilities\FeaturesUtil' ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', SOURCESAY_FILE, true );
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', SOURCESAY_FILE, true );
		}
	}
);

add_action( 'plugins_loaded', 'sourcesay_maybe_upgrade' );
