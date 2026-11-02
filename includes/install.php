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
	if ( (int) get_option( 'sourcesay_db_version', 0 ) < SOURCESAY_DB_VERSION ) {
		sourcesay_create_table();
	}
}
