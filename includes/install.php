<?php
/**
 * Activation, table creation and upgrades.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * Full name of the responses table.
 *
 * @return string
 */
function sourcesay_table() {
	global $wpdb;
	return $wpdb->prefix . 'sourcesay_responses';
}

/**
 * Create or update the responses table.
 *
 * @return void
 */
function sourcesay_create_table() {
	global $wpdb;
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';

	$table   = sourcesay_table();
	$charset = $wpdb->get_charset_collate();

	$sql = "CREATE TABLE {$table} (
	id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
	order_id bigint(20) unsigned NOT NULL,
	customer_id bigint(20) unsigned NOT NULL DEFAULT 0,
	question varchar(191) NOT NULL DEFAULT '',
	answer_id varchar(64) NOT NULL DEFAULT '',
	answer_label varchar(191) NOT NULL DEFAULT '',
	followup_text text NULL,
	other_text text NULL,
	order_total decimal(19,4) NOT NULL DEFAULT 0,
	order_total_base decimal(19,4) NOT NULL DEFAULT 0,
	order_currency char(3) NOT NULL DEFAULT '',
	order_status varchar(32) NOT NULL DEFAULT '',
	order_created datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
	is_returning tinyint(1) NOT NULL DEFAULT 0,
	is_test tinyint(1) NOT NULL DEFAULT 0,
	wc_source_type varchar(32) NULL,
	wc_source varchar(191) NULL,
	context varchar(16) NOT NULL DEFAULT 'thankyou',
	created_at datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
	PRIMARY KEY  (id),
	UNIQUE KEY order_id (order_id),
	KEY answer_id (answer_id),
	KEY order_status (order_status),
	KEY order_created (order_created)
) {$charset};";

	dbDelta( $sql );
	update_option( 'sourcesay_db_version', SOURCESAY_DB_VERSION );
}

/**
 * Plugin activation.
 *
 * @return void
 */
function sourcesay_activate() {
	sourcesay_create_table();
	if ( false === get_option( 'sourcesay_settings', false ) ) {
		add_option( 'sourcesay_settings', sourcesay_default_settings(), '', 'yes' );
	}
	sourcesay_schedule_cron();
}

/**
 * Plugin deactivation.
 *
 * @return void
 */
function sourcesay_deactivate() {
	wp_clear_scheduled_hook( 'sourcesay_daily' );
}

/**
 * Run the table upgrade when the stored DB version is behind.
 *
 * @return void
 */
function sourcesay_maybe_upgrade() {
	$stored = (int) get_option( 'sourcesay_db_version', 0 );
	if ( $stored < SOURCESAY_DB_VERSION ) {
		sourcesay_create_table();
		if ( $stored > 0 && $stored < 2 ) {
			sourcesay_backfill_base_totals();
		}
	}
}

/**
 * DB version 2: fill order_total_base for rows saved before the column existed.
 *
 * @return void
 */
function sourcesay_backfill_base_totals() {
	global $wpdb;
	$table = sourcesay_table();
	$base  = sourcesay_cut( (string) get_option( 'woocommerce_currency', '' ), 3 );
	// Same currency (or unknown): base = total.
	$wpdb->query( $wpdb->prepare( 'UPDATE %i SET order_total_base = order_total WHERE order_total_base = 0 AND (order_currency = %s OR order_currency = %s)', $table, $base, '' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	// Other currencies need the order meta; ponytail: first 2000 rows, later rows are filled when their order syncs.
	if ( ! function_exists( 'wc_get_order' ) ) {
		return;
	}
	$rows = $wpdb->get_results( $wpdb->prepare( 'SELECT order_id, order_total FROM %i WHERE order_total_base = 0 AND order_total <> 0 LIMIT 2000', $table ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	foreach ( $rows as $r ) {
		$order = wc_get_order( (int) $r['order_id'] );
		$value = $order ? sourcesay_order_total_base( $order, (float) $r['order_total'] ) : (float) $r['order_total'];
		$wpdb->update( $table, array( 'order_total_base' => $value ), array( 'order_id' => (int) $r['order_id'] ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	}
}
