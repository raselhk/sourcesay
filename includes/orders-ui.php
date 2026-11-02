<?php
/**
 * Orders list column, answer filter and order meta box.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * Add the column after the order status/date.
 *
 * @param array $columns Columns.
 * @return array
 */
function sourcesay_orders_columns( $columns ) {
	$columns['sourcesay'] = __( 'Heard about us', 'sourcesay' );
	return $columns;
}
add_filter( 'manage_woocommerce_page_wc-orders_columns', 'sourcesay_orders_columns' );
add_filter( 'manage_edit-shop_order_columns', 'sourcesay_orders_columns' );

/**
 * Render a cell.
 *
 * @param string       $column Column key.
 * @param WC_Order|int $order  Order object (HPOS) or post id (legacy).
 * @return void
 */
function sourcesay_orders_cell( $column, $order ) {
	if ( 'sourcesay' !== $column ) {
		return;
	}
	$order_id = $order instanceof WC_Order ? $order->get_id() : (int) $order;
	$row      = sourcesay_get_response( $order_id );
	if ( ! $row ) {
		echo '<span aria-hidden="true">&ndash;</span>';
		return;
	}
	echo esc_html( $row['answer_label'] );
	if ( '' !== (string) $row['followup_text'] ) {
		echo '<br><small>' . esc_html( $row['followup_text'] ) . '</small>';
	}
}
add_action( 'manage_woocommerce_page_wc-orders_custom_column', 'sourcesay_orders_cell', 10, 2 );
add_action( 'manage_shop_order_posts_custom_column', 'sourcesay_orders_cell', 10, 2 );

/**
 * Currently selected answer filter.
 *
 * @return string
 */
function sourcesay_current_filter() {
	return isset( $_GET['sourcesay_answer'] ) ? sanitize_key( wp_unslash( $_GET['sourcesay_answer'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
}

/**
 * Print the filter dropdown.
 *
 * @return void
 */
function sourcesay_filter_dropdown() {
	$settings = sourcesay_get_settings();
	$current  = sourcesay_current_filter();
	echo '<label for="sourcesay-answer-filter" class="screen-reader-text">' . esc_html__( 'Filter by how customers heard about you', 'sourcesay' ) . '</label>';
	echo '<select name="sourcesay_answer" id="sourcesay-answer-filter"><option value="">' . esc_html__( 'Heard about us: all answers', 'sourcesay' ) . '</option>';
	foreach ( $settings['options'] as $opt ) {
		printf( '<option value="%s"%s>%s</option>', esc_attr( $opt['id'] ), selected( $current, $opt['id'], false ), esc_html( $opt['label'] ) );
	}
	printf( '<option value="other"%s>%s</option>', selected( $current, 'other', false ), esc_html( $settings['other']['label'] ) );
	printf( '<option value="__skip"%s>%s</option></select>', selected( $current, '__skip', false ), esc_html__( 'Skipped', 'sourcesay' ) );
}
add_action( 'woocommerce_order_list_table_restrict_manage_orders', 'sourcesay_filter_dropdown' );
add_action(
	'restrict_manage_posts',
	static function ( $post_type ) {
		if ( 'shop_order' === $post_type ) {
			sourcesay_filter_dropdown();
		}
	}
);

/**
 * HPOS list query.
 *
 * @param array $args Query args.
 * @return array
 */
function sourcesay_filter_hpos_query( $args ) {
	$answer = sourcesay_current_filter();
	if ( '' !== $answer ) {
		$args['meta_query'][] = array(
			'key'   => '_sourcesay_answer_id',
			'value' => $answer,
		);
	}
	return $args;
}
add_filter( 'woocommerce_order_list_table_prepare_items_query_args', 'sourcesay_filter_hpos_query' );

/**
 * Legacy list query.
 *
 * @param WP_Query $query Query.
 * @return void
 */
function sourcesay_filter_legacy_query( $query ) {
	$answer = sourcesay_current_filter();
	if ( '' === $answer || ! is_admin() || ! $query->is_main_query() || 'shop_order' !== $query->get( 'post_type' ) ) {
		return;
	}
	$meta   = (array) $query->get( 'meta_query' );
	$meta[] = array(
		'key'   => '_sourcesay_answer_id',
		'value' => $answer,
	);
	$query->set( 'meta_query', $meta );
}
add_action( 'pre_get_posts', 'sourcesay_filter_legacy_query' );

/**
 * Register the side meta box.
 *
 * @return void
 */
function sourcesay_add_meta_box() {
	$hpos   = class_exists( '\Automattic\WooCommerce\Utilities\OrderUtil' ) && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();
	$screen = $hpos && function_exists( 'wc_get_page_screen_id' ) ? wc_get_page_screen_id( 'shop-order' ) : 'shop_order';
	add_meta_box( 'sourcesay', __( 'SourceSay', 'sourcesay' ), 'sourcesay_meta_box', $screen, 'side', 'default' );
}
add_action( 'add_meta_boxes', 'sourcesay_add_meta_box' );

/**
 * Meta box content.
 *
 * @param WP_Post|WC_Order $post_or_order Edit screen object.
 * @return void
 */
function sourcesay_meta_box( $post_or_order ) {
	$order = $post_or_order instanceof WC_Order ? $post_or_order : wc_get_order( $post_or_order->ID );
	if ( ! $order ) {
		return;
	}
	$row = sourcesay_get_response( $order->get_id() );
	if ( $row ) {
		echo '<p><strong>' . esc_html( $row['answer_label'] ) . '</strong></p>';
		if ( '' !== (string) $row['followup_text'] ) {
			echo '<p>' . esc_html( $row['followup_text'] ) . '</p>';
		}
		if ( '' !== (string) $row['other_text'] ) {
			echo '<p>' . esc_html( $row['other_text'] ) . '</p>';
		}
	} else {
		echo '<p>' . esc_html__( 'The customer has not answered yet.', 'sourcesay' ) . '</p>';
	}
	$type   = (string) $order->get_meta( '_wc_order_attribution_source_type' );
	$source = (string) $order->get_meta( '_wc_order_attribution_utm_source' );
	$labels = sourcesay_wc_source_labels();
	if ( '' !== $type || '' !== $source ) {
		$text = trim( ( isset( $labels[ $type ] ) ? $labels[ $type ] : $type ) . ( '' !== $source ? ' / ' . $source : '' ) );
		/* translators: %s: WooCommerce tracked source, e.g. "Campaign (UTM) / instagram". */
		echo '<p class="description">' . esc_html( sprintf( __( 'WooCommerce tracked: %s', 'sourcesay' ), $text ) ) . '</p>';
	}
}
