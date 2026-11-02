<?php
/**
 * Personal data exporter and eraser.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register with the WordPress privacy tools.
 *
 * @param array $items Registered callbacks.
 * @return array
 */
function sourcesay_register_exporter( $items ) {
	$items['sourcesay'] = array(
		'exporter_friendly_name' => __( 'SourceSay', 'sourcesay' ),
		'callback'               => 'sourcesay_privacy_export',
	);
	return $items;
}
add_filter( 'wp_privacy_personal_data_exporters', 'sourcesay_register_exporter' );

/**
 * Register the eraser.
 *
 * @param array $items Registered callbacks.
 * @return array
 */
function sourcesay_register_eraser( $items ) {
	$items['sourcesay'] = array(
		'eraser_friendly_name' => __( 'SourceSay', 'sourcesay' ),
		'callback'             => 'sourcesay_privacy_erase',
	);
	return $items;
}
add_filter( 'wp_privacy_personal_data_erasers', 'sourcesay_register_eraser' );

/**
 * Order ids billed to an email address (50 per page).
 *
 * @param string $email Email.
 * @param int    $page  1-based page.
 * @return int[]
 */
function sourcesay_privacy_order_ids( $email, $page ) {
	return wc_get_orders(
		array(
			'billing_email' => $email,
			'limit'         => 50,
			'paged'         => max( 1, (int) $page ),
			'return'        => 'ids',
			'status'        => array_keys( wc_get_order_statuses() ),
		)
	);
}

/**
 * Export callback.
 *
 * @param string $email Email.
 * @param int    $page  Page.
 * @return array
 */
function sourcesay_privacy_export( $email, $page = 1 ) {
	$ids  = sourcesay_privacy_order_ids( $email, $page );
	$data = array();
	foreach ( $ids as $order_id ) {
		$row = sourcesay_get_response( $order_id );
		if ( ! $row ) {
			continue;
		}
		$data[] = array(
			'group_id'          => 'sourcesay',
			'group_label'       => __( 'SourceSay survey answers', 'sourcesay' ),
			'group_description' => __( 'How the customer said they found the store.', 'sourcesay' ),
			'item_id'           => 'sourcesay-' . $row['order_id'],
			'data'              => array(
				array(
					'name'  => __( 'Order', 'sourcesay' ),
					'value' => '#' . $row['order_id'],
				),
				array(
					'name'  => __( 'Question', 'sourcesay' ),
					'value' => $row['question'],
				),
				array(
					'name'  => __( 'Answer', 'sourcesay' ),
					'value' => $row['answer_label'],
				),
				array(
					'name'  => __( 'Follow-up', 'sourcesay' ),
					'value' => (string) $row['followup_text'],
				),
				array(
					'name'  => __( 'Other', 'sourcesay' ),
					'value' => (string) $row['other_text'],
				),
				array(
					'name'  => __( 'Answered on', 'sourcesay' ),
					'value' => $row['created_at'] . ' UTC',
				),
			),
		);
	}
	return array(
		'data' => $data,
		'done' => count( $ids ) < 50,
	);
}

/**
 * Eraser callback: blank free text and unlink the customer.
 *
 * @param string $email Email.
 * @param int    $page  Page.
 * @return array
 */
function sourcesay_privacy_erase( $email, $page = 1 ) {
	global $wpdb;
	$ids     = sourcesay_privacy_order_ids( $email, $page );
	$removed = false;
	foreach ( $ids as $order_id ) {
		if ( ! sourcesay_get_response( $order_id ) ) {
			continue;
		}
		$wpdb->update(
			sourcesay_table(),
			array(
				'followup_text' => '',
				'other_text'    => '',
				'customer_id'   => 0,
			),
			array( 'order_id' => (int) $order_id )
		); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$removed = true;
	}
	if ( $removed ) {
		sourcesay_flush_report_cache();
	}
	return array(
		'items_removed'  => $removed,
		'items_retained' => false,
		'messages'       => array(),
		'done'           => count( $ids ) < 50,
	);
}
