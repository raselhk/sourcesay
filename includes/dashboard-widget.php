<?php
/**
 * WordPress Dashboard widget: how customers found you (last 30 days).
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register the widget for shop managers.
 *
 * @return void
 */
function sourcesay_register_dashboard_widget() {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		return;
	}
	wp_add_dashboard_widget( 'sourcesay_dashboard', __( 'SourceSay: how customers found you', 'sourcesay' ), 'sourcesay_dashboard_widget' );
}
add_action( 'wp_dashboard_setup', 'sourcesay_register_dashboard_widget' );

/**
 * Load the widget stylesheet on the Dashboard only.
 *
 * @param string $hook Admin page hook.
 * @return void
 */
function sourcesay_dashboard_assets( $hook ) {
	if ( 'index.php' === $hook && current_user_can( 'manage_woocommerce' ) && file_exists( SOURCESAY_PATH . 'assets/css/dashboard.css' ) ) {
		wp_enqueue_style( 'sourcesay-dashboard', SOURCESAY_URL . 'assets/css/dashboard.css', array(), sourcesay_asset_version( 'assets/css/dashboard.css' ) );
		wp_enqueue_style( 'sourcesay-charts', SOURCESAY_URL . 'assets/css/charts.css', array( 'sourcesay-dashboard' ), sourcesay_asset_version( 'assets/css/charts.css' ) );
	}
}
add_action( 'admin_enqueue_scripts', 'sourcesay_dashboard_assets' );

/**
 * Widget markup.
 *
 * @return void
 */
function sourcesay_dashboard_widget() {
	$report   = sourcesay_get_report();
	$settings = sourcesay_get_settings();
	$link     = admin_url( 'admin.php?page=sourcesay' );
	$totals   = $report['totals'];

	echo '<div class="sourcesay ss-widget">';
	if ( empty( $settings['enabled'] ) && 0 === $totals['responses'] ) {
		echo '<p class="ss-widget__empty">' . esc_html__( 'Your survey is turned off, so customers do not see it yet. Turn it on and you will see which channels bring revenue here.', 'sourcesay' ) . '</p>';
		echo '<p><a class="button button-primary" href="' . esc_url( $link . '#survey' ) . '">' . esc_html__( 'Set up the survey', 'sourcesay' ) . '</a></p></div>';
		return;
	}
	if ( 0 === $totals['responses'] ) {
		echo '<p class="ss-widget__empty">' . esc_html__( 'No answers in the last 30 days yet. As soon as customers answer, the channels that bring you orders show up here.', 'sourcesay' ) . '</p>';
		echo '<p><a class="button" href="' . esc_url( $link ) . '">' . esc_html__( 'Open SourceSay', 'sourcesay' ) . '</a></p></div>';
		return;
	}

	echo '<p class="ss-widget__rate">';
	printf(
		/* translators: 1: response rate percent, 2: number of answers. */
		esc_html__( '%1$s of customers answered (%2$s answers, last 30 days).', 'sourcesay' ),
		'<strong>' . esc_html( number_format_i18n( $totals['response_rate'] * 100, 0 ) . '%' ) . '</strong>',
		esc_html( number_format_i18n( $totals['responses'] ) )
	);
	echo '</p><table class="ss-widget__table"><thead><tr><th>' . esc_html__( 'Channel', 'sourcesay' ) . '</th><th>' . esc_html__( 'Answers', 'sourcesay' ) . '</th><th><span class="ss-swatch" aria-hidden="true"></span> ' . esc_html__( 'Revenue', 'sourcesay' ) . '</th></tr></thead><tbody>';
	$top     = array_slice( $report['channels'], 0, 5 );
	$max_rev = max( 0.01, max( array_map( 'floatval', wp_list_pluck( $top, 'revenue' ) ) ) );
	foreach ( $top as $c ) {
		// Bar length: this channel's revenue against the top channel's, from zero.
		$w = round( max( 0, (float) $c['revenue'] ) / $max_rev * 100, 1 );
		echo '<tr><td><span class="ss-widget__chan">' . esc_html( $c['label'] ) . '</span><span class="ss-widget__track" aria-hidden="true"><span class="ss-widget__fill" style="width:' . esc_attr( $w ) . '%"></span></span></td><td>' . esc_html( number_format_i18n( $c['responses'] ) ) . '</td><td>' . wp_kses_post( wc_price( $c['revenue'] ) ) . '</td></tr>';
	}
	echo '</tbody></table>';
	echo '<p class="ss-widget__more"><a href="' . esc_url( $link ) . '">' . esc_html__( 'See the full report', 'sourcesay' ) . ' &rarr;</a></p></div>';
}
