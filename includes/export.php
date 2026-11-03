<?php
/**
 * CSV export.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * Neutralise spreadsheet formulas (CSV injection).
 *
 * @param mixed $value Cell value.
 * @return string
 */
function sourcesay_csv_cell( $value ) {
	$value = (string) $value;
	if ( '' !== $value && preg_match( '/^[=+\-@\t\r]/', $value ) ) {
		return "'" . $value;
	}
	return $value;
}

/**
 * Export rows including the header row.
 *
 * @param string $from YYYY-MM-DD.
 * @param string $to   YYYY-MM-DD.
 * @return array[]
 */
function sourcesay_export_rows( $from, $to ) {
	global $wpdb;
	$range = sourcesay_resolve_range( $from, $to );
	$table = sourcesay_table();
	$items = $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM %i WHERE is_test = 0 AND order_created BETWEEN %s AND %s ORDER BY order_created ASC', $table, $range['start'], $range['end'] ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery

	/**
	 * CSV columns, in order. Add a key here and fill it with the sourcesay_csv_row filter.
	 *
	 * @param string[] $columns Column keys (also the header row).
	 */
	$columns = array_values( (array) apply_filters( 'sourcesay_csv_columns', array( 'date', 'order_id', 'order_number', 'answer', 'follow_up', 'other', 'order_total', 'currency', 'status', 'returning', 'woocommerce_source_type', 'woocommerce_source' ) ) );
	$rows    = array( array_map( 'sourcesay_csv_cell', $columns ) );
	foreach ( $items as $r ) {
		$order = wc_get_order( (int) $r['order_id'] );
		$row   = array(
			'date'                    => get_date_from_gmt( $r['order_created'], 'Y-m-d' ),
			'order_id'                => $r['order_id'],
			'order_number'            => $order ? $order->get_order_number() : $r['order_id'],
			'answer'                  => '__skip' === $r['answer_id'] ? __( 'Skipped', 'sourcesay' ) : $r['answer_label'],
			'follow_up'               => $r['followup_text'],
			'other'                   => $r['other_text'],
			'order_total'             => $r['order_total'],
			'currency'                => $r['order_currency'],
			'status'                  => $r['order_status'],
			'returning'               => $r['is_returning'] ? 'yes' : 'no',
			'woocommerce_source_type' => $r['wc_source_type'],
			'woocommerce_source'      => $r['wc_source'],
		);
		/**
		 * Values of one CSV row, keyed by column.
		 *
		 * @param array         $row      Column => value.
		 * @param array         $response Response table row.
		 * @param WC_Order|false $order   The order, or false when it was deleted.
		 */
		$row  = (array) apply_filters( 'sourcesay_csv_row', $row, $r, $order );
		$line = array();
		foreach ( $columns as $col ) {
			$line[] = sourcesay_csv_cell( isset( $row[ $col ] ) && is_scalar( $row[ $col ] ) ? $row[ $col ] : '' );
		}
		$rows[] = $line;
	}
	return $rows;
}

/**
 * Stream the CSV download.
 *
 * @return void
 */
function sourcesay_handle_export() {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		wp_die( esc_html__( 'You are not allowed to export this data.', 'sourcesay' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'sourcesay_export' );

	$from = isset( $_GET['from'] ) ? sanitize_text_field( wp_unslash( $_GET['from'] ) ) : '';
	$to   = isset( $_GET['to'] ) ? sanitize_text_field( wp_unslash( $_GET['to'] ) ) : '';
	$rows = sourcesay_export_rows( $from, $to );

	nocache_headers();
	header( 'Content-Type: text/csv; charset=utf-8' );
	header( 'Content-Disposition: attachment; filename="sourcesay-' . gmdate( 'Y-m-d' ) . '.csv"' );

	$out = fopen( 'php://output', 'w' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen
	fwrite( $out, "\xEF\xBB\xBF" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fwrite
	foreach ( $rows as $row ) {
		fputcsv( $out, $row ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fputcsv
	}
	fclose( $out ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose
	exit;
}
add_action( 'admin_post_sourcesay_export', 'sourcesay_handle_export' );
