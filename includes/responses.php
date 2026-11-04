<?php
/**
 * Response storage and live order sync.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * Invalidate cached report results.
 *
 * @return void
 */
function sourcesay_flush_report_cache() {
	update_option( 'sourcesay_cache_v', (int) get_option( 'sourcesay_cache_v', 0 ) + 1, false );
}

/**
 * Fetch the response row of an order.
 *
 * @param int $order_id Order id.
 * @return array|null
 */
function sourcesay_get_response( $order_id ) {
	global $wpdb;
	$table = sourcesay_table();
	$row   = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM %i WHERE order_id = %d', $table, (int) $order_id ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	return $row ? $row : null;
}

/**
 * Net order total (total minus refunds).
 *
 * @param WC_Order $order Order.
 * @return float
 */
function sourcesay_net_total( $order ) {
	return (float) $order->get_total() - (float) $order->get_total_refunded();
}

/**
 * Did the customer have an earlier paid order?
 *
 * @param WC_Order $order Order.
 * @return int 1 or 0.
 */
function sourcesay_is_returning( $order ) {
	$args = array(
		'status'       => wc_get_is_paid_statuses(),
		'exclude'      => array( $order->get_id() ),
		'date_created' => '<' . ( $order->get_date_created() ? $order->get_date_created()->getTimestamp() : time() ),
		'limit'        => 1,
		'return'       => 'ids',
	);
	if ( $order->get_customer_id() ) {
		$args['customer_id'] = $order->get_customer_id();
	} elseif ( $order->get_billing_email() ) {
		$args['billing_email'] = $order->get_billing_email();
	} else {
		return 0;
	}
	return wc_get_orders( $args ) ? 1 : 0;
}

/**
 * Validate and store an answer for an order.
 *
 * @param WC_Order $order    Order.
 * @param string   $answer_id Option id or "other".
 * @param string   $followup Follow-up text.
 * @param string   $other    "Other" text.
 * @param string   $context  thankyou|account|nojs.
 * @return int|WP_Error Row id.
 */
function sourcesay_save_response( $order, $answer_id, $followup = '', $other = '', $context = 'thankyou' ) {
	global $wpdb;

	$settings = sourcesay_get_settings();
	// "__skip" is stored as a row so the survey is not shown again, but it is never an answer.
	$answer_id = '__skip' === $answer_id ? '__skip' : sanitize_key( $answer_id );
	if ( '__skip' === $answer_id ) {
		$valid    = ! empty( $settings['allow_skip'] );
		$label    = $settings['skip_label'];
		$followup = '';
		$other    = '';
	} elseif ( 'other' === $answer_id ) {
		$valid = ! empty( $settings['other']['enabled'] );
		$label = $settings['other']['label'];
	} else {
		$opt   = sourcesay_find_option( $answer_id, $settings );
		$valid = (bool) $opt;
		$label = $opt ? $opt['label'] : '';
	}
	if ( ! $valid ) {
		return new WP_Error( 'sourcesay_invalid_answer', __( 'That answer is not available.', 'sourcesay' ), array( 'status' => 400 ) );
	}
	if ( sourcesay_get_response( $order->get_id() ) ) {
		return new WP_Error( 'sourcesay_already_answered', __( 'This order was already answered.', 'sourcesay' ), array( 'status' => 409 ) );
	}

	$created = $order->get_date_created();
	$data    = array(
		'order_id'         => $order->get_id(),
		'customer_id'      => $order->get_customer_id(),
		'question'         => sourcesay_cut( $settings['question'], 191 ),
		'answer_id'        => $answer_id,
		'answer_label'     => sourcesay_cut( $label, 191 ),
		'followup_text'    => sourcesay_cut( sanitize_textarea_field( $followup ), 500 ),
		'other_text'       => 'other' === $answer_id ? sourcesay_cut( sanitize_textarea_field( $other ), 500 ) : '',
		'order_total'      => sourcesay_net_total( $order ),
		'order_total_base' => sourcesay_order_total_base( $order ),
		'order_currency'   => sourcesay_cut( $order->get_currency(), 3 ),
		'order_status'     => $order->get_status(),
		'order_created'    => gmdate( 'Y-m-d H:i:s', $created ? $created->getTimestamp() : time() ),
		'is_returning'     => sourcesay_is_returning( $order ),
		'is_test'          => $order->get_meta( '_sourcesay_test' ) ? 1 : 0,
		'wc_source_type'   => sourcesay_cut( (string) $order->get_meta( '_wc_order_attribution_source_type' ), 32 ),
		'wc_source'        => sourcesay_cut( (string) $order->get_meta( '_wc_order_attribution_utm_source' ), 191 ),
		'context'          => in_array( $context, array( 'thankyou', 'account', 'nojs' ), true ) ? $context : 'thankyou',
		'created_at'       => gmdate( 'Y-m-d H:i:s' ),
	);
	/**
	 * Filter the row about to be inserted.
	 *
	 * @param array    $data  Row data.
	 * @param WC_Order $order Order.
	 */
	$data = apply_filters( 'sourcesay_response_data', $data, $order );

	$suppress = $wpdb->suppress_errors( true );
	$ok       = $wpdb->insert( sourcesay_table(), $data ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
	$wpdb->suppress_errors( $suppress );
	if ( ! $ok ) {
		// Lost a race against the unique key.
		return new WP_Error( 'sourcesay_already_answered', __( 'This order was already answered.', 'sourcesay' ), array( 'status' => 409 ) );
	}
	$id = (int) $wpdb->insert_id;

	$order->update_meta_data( '_sourcesay_answer_id', $answer_id );
	$order->save_meta_data();
	sourcesay_flush_report_cache();

	if ( '__skip' !== $answer_id ) {
		$detail = '' !== (string) $data['followup_text'] ? $data['followup_text'] : $data['other_text'];
		if ( '' !== (string) $detail ) {
			/* translators: 1: answer label, 2: follow-up or "other" text. */
			$note = sprintf( __( 'Customer said: %1$s (%2$s)', 'sourcesay' ), $data['answer_label'], $detail );
		} else {
			/* translators: %s: answer label. */
			$note = sprintf( __( 'Customer said: %s', 'sourcesay' ), $data['answer_label'] );
		}
		$note_id = $order->add_order_note( $note, false ); // Private note.
		if ( $note_id ) {
			$order->update_meta_data( '_sourcesay_note_id', (int) $note_id ); // So the privacy eraser can redact it.
			$order->save_meta_data();
		}
	}

	/**
	 * Fires after a response is stored.
	 *
	 * @param int      $id    Row id.
	 * @param array    $data  Row data.
	 * @param WC_Order $order Order.
	 */
	do_action( 'sourcesay_response_saved', $id, $data, $order );

	return $id;
}

/**
 * Refresh the live order fields of an existing response.
 *
 * @param int $order_id Order id.
 * @return void
 */
function sourcesay_sync_order( $order_id ) {
	global $wpdb;
	$row = sourcesay_get_response( $order_id );
	if ( ! $row ) {
		return;
	}
	$order = wc_get_order( $order_id );
	if ( ! $order ) {
		return;
	}
	$fields = array(
		'order_total'      => sourcesay_net_total( $order ),
		'order_total_base' => sourcesay_order_total_base( $order ),
		'order_status'     => $order->get_status(),
	);
	if ( abs( (float) $row['order_total'] - $fields['order_total'] ) < 0.00005 && abs( (float) $row['order_total_base'] - $fields['order_total_base'] ) < 0.00005 && $row['order_status'] === $fields['order_status'] ) {
		return;
	}
	$wpdb->update( sourcesay_table(), $fields, array( 'order_id' => (int) $order_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
	sourcesay_flush_report_cache();
}
add_action( 'woocommerce_order_status_changed', 'sourcesay_sync_order', 20 );
add_action( 'woocommerce_order_refunded', 'sourcesay_sync_order', 20 );
add_action( 'woocommerce_update_order', 'sourcesay_sync_order', 20 );
// Trashed orders keep their answer but stop counting (status "trash"); restoring brings it back.
add_action( 'woocommerce_trash_order', 'sourcesay_sync_order', 20 );
add_action( 'woocommerce_untrash_order', 'sourcesay_sync_order', 20 );

/**
 * Legacy (post) order storage: trash and restore arrive as post events.
 *
 * @param int $post_id Post id.
 * @return void
 */
function sourcesay_sync_order_post( $post_id ) {
	if ( in_array( get_post_type( $post_id ), wc_get_order_types(), true ) ) {
		sourcesay_sync_order( $post_id );
	}
}
add_action( 'trashed_post', 'sourcesay_sync_order_post', 20 );
add_action( 'untrashed_post', 'sourcesay_sync_order_post', 20 );

/**
 * A permanently deleted order takes its answer with it, so reports never count an order that no longer exists.
 *
 * @param int $order_id Order id.
 * @return void
 */
function sourcesay_delete_order_response( $order_id ) {
	global $wpdb;
	if ( $wpdb->delete( sourcesay_table(), array( 'order_id' => (int) $order_id ) ) ) { // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		sourcesay_flush_report_cache();
	}
}
add_action( 'woocommerce_delete_order', 'sourcesay_delete_order_response', 20 );

/**
 * Legacy (post) order storage: permanent delete of an order post.
 *
 * @param int     $post_id Post id.
 * @param WP_Post $post    Deleted post (WP 5.5+).
 * @return void
 */
function sourcesay_delete_order_post( $post_id, $post = null ) {
	if ( $post instanceof WP_Post && in_array( $post->post_type, wc_get_order_types(), true ) ) {
		sourcesay_delete_order_response( $post_id );
	}
}
add_action( 'deleted_post', 'sourcesay_delete_order_post', 20, 2 );
