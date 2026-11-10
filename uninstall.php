<?php
/**
 * Uninstall: remove data only when the store owner opted in.
 *
 * @package SourceSay
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

wp_clear_scheduled_hook( 'sourcesay_daily' );

$sourcesay_settings = get_option( 'sourcesay_settings', array() );
if ( empty( $sourcesay_settings['delete_on_uninstall'] ) ) {
	return;
}

global $wpdb;
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}sourcesay_responses" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.SchemaChange

$sourcesay_hpos_meta = $wpdb->prefix . 'wc_orders_meta';
$sourcesay_has_hpos  = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $sourcesay_hpos_meta ) ) === $sourcesay_hpos_meta; // phpcs:ignore WordPress.DB.DirectDatabaseQuery
foreach ( array( '_sourcesay_answer_id', '_sourcesay_test', '_sourcesay_note_id' ) as $sourcesay_meta_key ) {
	$wpdb->delete( $wpdb->postmeta, array( 'meta_key' => $sourcesay_meta_key ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.SlowDBQuery.slow_db_query_meta_key
	if ( $sourcesay_has_hpos ) {
		$wpdb->delete( $sourcesay_hpos_meta, array( 'meta_key' => $sourcesay_meta_key ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.SlowDBQuery.slow_db_query_meta_key
	}
}
foreach ( array( 'pro_card', 'review', 'review_later' ) as $sourcesay_dismiss_key ) {
	delete_metadata( 'user', 0, 'sourcesay_dismissed_' . $sourcesay_dismiss_key, '', true );
}

delete_option( 'sourcesay_settings' );
delete_option( 'sourcesay_db_version' );
delete_option( 'sourcesay_cache_v' );
delete_option( 'sourcesay_setup_done' );
delete_option( 'sourcesay_i18n_hash' );
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\_transient\_sourcesay\_%' OR option_name LIKE '\_transient\_timeout\_sourcesay\_%'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
