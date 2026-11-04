<?php
/**
 * Daily retention clean-up.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * Make sure the daily event exists.
 *
 * @return void
 */
function sourcesay_schedule_cron() {
	if ( ! wp_next_scheduled( 'sourcesay_daily' ) ) {
		wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'sourcesay_daily' );
	}
}
add_action( 'init', 'sourcesay_schedule_cron' );

/**
 * Delete responses older than the retention window.
 *
 * @return int Rows deleted.
 */
function sourcesay_cron_cleanup() {
	global $wpdb;
	$days = (int) sourcesay_get_settings()['retention_days'];
	if ( $days < 1 ) {
		return 0;
	}
	$table   = sourcesay_table();
	$cutoff  = gmdate( 'Y-m-d H:i:s', time() - $days * DAY_IN_SECONDS );
	$deleted = (int) $wpdb->query( $wpdb->prepare( 'DELETE FROM %i WHERE created_at < %s', $table, $cutoff ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
	if ( $deleted ) {
		sourcesay_flush_report_cache();
	}
	return $deleted;
}
add_action( 'sourcesay_daily', 'sourcesay_cron_cleanup' );
