<?php
/**
 * Customer profile section, order search by answer, and the admin email line.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * "How they found you" section on the user profile screen.
 *
 * @param WP_User $user User being viewed.
 * @return void
 */
function sourcesay_profile_section( $user ) {
	global $wpdb;
	if ( ! current_user_can( 'manage_woocommerce' ) || ! $user instanceof WP_User ) {
		return;
	}
	$rows = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM %i WHERE customer_id = %d AND is_test = 0 AND answer_id <> '__skip' ORDER BY order_created DESC LIMIT 50", sourcesay_table(), $user->ID ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	echo '<h2>' . esc_html__( 'How they found you', 'sourcesay' ) . '</h2>';
	if ( ! $rows ) {
		echo '<p>' . esc_html__( 'No survey answers from this customer yet.', 'sourcesay' ) . '</p>';
		return;
	}
	echo '<table class="widefat striped" style="max-width:720px"><thead><tr><th>' . esc_html__( 'Date', 'sourcesay' ) . '</th><th>' . esc_html__( 'Order', 'sourcesay' ) . '</th><th>' . esc_html__( 'Answer', 'sourcesay' ) . '</th><th>' . esc_html__( 'Details', 'sourcesay' ) . '</th></tr></thead><tbody>';
	foreach ( $rows as $r ) {
		$order  = wc_get_order( (int) $r['order_id'] );
		$detail = '' !== (string) $r['followup_text'] ? $r['followup_text'] : $r['other_text'];
		echo '<tr><td>' . esc_html( get_date_from_gmt( $r['order_created'], get_option( 'date_format' ) ) ) . '</td><td>';
		if ( $order ) {
			echo '<a href="' . esc_url( $order->get_edit_order_url() ) . '">#' . esc_html( $order->get_order_number() ) . '</a>';
		} else {
			echo '#' . esc_html( $r['order_id'] );
		}
		echo '</td><td>' . esc_html( $r['answer_label'] ) . '</td><td>' . esc_html( (string) $detail ) . '</td></tr>';
	}
	echo '</tbody></table>';
}
add_action( 'show_user_profile', 'sourcesay_profile_section' );
add_action( 'edit_user_profile', 'sourcesay_profile_section' );

/**
 * Add "How they found you" as a search field of the HPOS orders list.
 *
 * @param array $options Search filters.
 * @return array
 */
function sourcesay_hpos_search_filters( $options ) {
	$options['sourcesay'] = __( 'How they found you', 'sourcesay' );
	return $options;
}
add_filter( 'woocommerce_hpos_admin_search_filters', 'sourcesay_hpos_search_filters' );

/**
 * HPOS search WHERE clause: answer label, follow-up text or "other" text.
 *
 * @param string $where  WHERE clause.
 * @param string $term   Search term.
 * @param string $filter Search filter name.
 * @param object $query  Orders table query.
 * @return string
 */
function sourcesay_hpos_search_where( $where, $term, $filter, $query ) {
	global $wpdb;
	if ( 'sourcesay' !== $filter || '' === trim( (string) $term ) || ! is_object( $query ) || ! method_exists( $query, 'get_table_name' ) ) {
		return $where;
	}
	$like = '%' . $wpdb->esc_like( $term ) . '%';
	return $wpdb->prepare(
		"{$query->get_table_name( 'orders' )}.id IN ( SELECT order_id FROM %i WHERE answer_label LIKE %s OR followup_text LIKE %s OR other_text LIKE %s )", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
		sourcesay_table(),
		$like,
		$like,
		$like
	);
}
add_filter( 'woocommerce_hpos_generate_where_for_search_filter', 'sourcesay_hpos_search_where', 10, 4 );

/**
 * Legacy (posts) orders search: add the orders whose answer matches.
 *
 * @param int[]  $order_ids Matching order ids.
 * @param string $term      Search term.
 * @return int[]
 */
function sourcesay_legacy_search( $order_ids, $term ) {
	global $wpdb;
	$term = trim( (string) $term );
	if ( '' === $term ) {
		return $order_ids;
	}
	$like = '%' . $wpdb->esc_like( $term ) . '%';
	$ids  = $wpdb->get_col( $wpdb->prepare( 'SELECT order_id FROM %i WHERE answer_label LIKE %s OR followup_text LIKE %s OR other_text LIKE %s LIMIT 500', sourcesay_table(), $like, $like, $like ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	return array_values( array_unique( array_merge( (array) $order_ids, array_map( 'intval', $ids ) ) ) );
}
add_filter( 'woocommerce_shop_order_search_results', 'sourcesay_legacy_search', 10, 2 );

/**
 * Show the answer in emails sent to the store owner (after the customer has answered).
 *
 * @param WC_Order $order         Order.
 * @param bool     $sent_to_admin Whether the email goes to the admin.
 * @param bool     $plain_text    Plain text email.
 * @return void
 */
function sourcesay_email_line( $order, $sent_to_admin, $plain_text ) {
	if ( ! $sent_to_admin || ! $order instanceof WC_Order ) {
		return;
	}
	$row = sourcesay_get_response( $order->get_id() );
	if ( ! $row || '__skip' === $row['answer_id'] ) {
		return;
	}
	$label = __( 'How they found you', 'sourcesay' );
	if ( $plain_text ) {
		echo "\n" . esc_html( $label . ': ' . $row['answer_label'] ) . "\n";
		return;
	}
	echo '<p><strong>' . esc_html( $label ) . ':</strong> ' . esc_html( $row['answer_label'] ) . '</p>';
}
add_action( 'woocommerce_email_order_meta', 'sourcesay_email_line', 20, 3 );
