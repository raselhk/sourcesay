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
	wp_add_dashboard_widget( 'sourcesay_dashboard', __( 'SourceSay: How customers found you', 'sourcesay' ), 'sourcesay_dashboard_widget' );
}
add_action( 'wp_dashboard_setup', 'sourcesay_register_dashboard_widget' );

/**
 * Load the widget stylesheets (brand tokens + font, charts, widget frame) on the Dashboard only.
 *
 * @param string $hook Admin page hook.
 * @return void
 */
function sourcesay_dashboard_assets( $hook ) {
	if ( 'index.php' !== $hook || ! current_user_can( 'manage_woocommerce' ) ) {
		return;
	}
	wp_enqueue_style( 'sourcesay-tokens', SOURCESAY_URL . 'assets/css/tokens.css', array(), sourcesay_asset_version( 'assets/css/tokens.css' ) );
	wp_enqueue_style( 'sourcesay-charts', SOURCESAY_URL . 'assets/css/charts.css', array( 'sourcesay-tokens' ), sourcesay_asset_version( 'assets/css/charts.css' ) );
	wp_enqueue_style( 'sourcesay-dashboard', SOURCESAY_URL . 'assets/css/dashboard.css', array( 'sourcesay-charts' ), sourcesay_asset_version( 'assets/css/dashboard.css' ) );
}
add_action( 'admin_enqueue_scripts', 'sourcesay_dashboard_assets' );

/**
 * Outline icon from the SourceSay sprite.
 *
 * @param string $key Icon key in assets/icons.svg.
 * @return string Safe HTML.
 */
function sourcesay_widget_icon( $key ) {
	return '<svg class="ss-ico" aria-hidden="true" focusable="false"><use href="' . esc_url( SOURCESAY_URL . 'assets/icons.svg#ss-i-' . sanitize_key( $key ) ) . '"></use></svg>';
}

/**
 * Change pill against the previous 30 days, same rules as the Reports tiles.
 *
 * @param float  $cur       Value in the last 30 days.
 * @param float  $prev      Value in the 30 days before.
 * @param bool   $pts       True for a rate: show percentage points.
 * @param int    $base      Previous denominator for a rate (paid orders).
 * @param string $prev_text Formatted previous value for the hover title.
 * @return string Safe HTML, or '' when there is nothing to compare.
 */
function sourcesay_widget_delta( $cur, $prev, $pts, $base, $prev_text ) {
	$cur   = (float) $cur;
	$prev  = (float) $prev;
	$empty = $pts ? ! $base : 0.0 === $prev;
	if ( $empty ) {
		if ( ! $cur ) {
			return '';
		}
		return '<span class="ss-delta ss-delta--flat">' . esc_html__( 'New', 'sourcesay' ) . '</span><span class="ss-w-tile__vs">' . esc_html__( 'No earlier data', 'sourcesay' ) . '</span>';
	}
	if ( $pts ) {
		$diff = round( ( $cur - $prev ) * 100, 1 );
		/* translators: %s: percentage points. */
		$fmt  = $diff > 0 ? __( '+%s pts', 'sourcesay' ) : __( '−%s pts', 'sourcesay' );
		$text = 0.0 === $diff ? __( 'No change', 'sourcesay' ) : sprintf( $fmt, number_format_i18n( abs( $diff ), abs( $diff ) < 10 ? 1 : 0 ) );
	} else {
		$diff = (int) round( ( $cur - $prev ) / $prev * 100 );
		$text = 0 === $diff ? __( 'No change', 'sourcesay' ) : ( $diff > 0 ? '+' : '−' ) . number_format_i18n( abs( $diff ) ) . '%';
	}
	$cls   = $diff > 0 ? 'up' : ( $diff < 0 ? 'down' : 'flat' );
	$arrow = $diff > 0 ? 'arrow-up' : ( $diff < 0 ? 'arrow-down' : '' );
	$say   = $diff > 0 ? __( 'Up from the previous period.', 'sourcesay' ) : ( $diff < 0 ? __( 'Down from the previous period.', 'sourcesay' ) : __( 'Same as the previous period.', 'sourcesay' ) );
	/* translators: %s: value in the previous 30 days. */
	$title = sprintf( __( 'Previous 30 days: %s', 'sourcesay' ), $prev_text );
	return '<span class="ss-delta ss-delta--' . esc_attr( $cls ) . '" title="' . esc_attr( $title ) . '">' . ( $arrow ? sourcesay_widget_icon( $arrow ) : '' )
		. '<span class="ss-sr">' . esc_html( $say ) . ' </span>' . esc_html( $text ) . '</span>'
		. '<span class="ss-w-tile__vs">' . esc_html__( 'vs previous 30 days', 'sourcesay' ) . '</span>';
}

/**
 * Channel colour slots, same rule as chanColors() in admin.js: rank by answers, then revenue;
 * up to 8 channels own a colour, from the 9th on the smallest fold into the grey "rest".
 *
 * @param array[] $channels Report channels.
 * @return array answer_id => CSS colour.
 */
function sourcesay_widget_colors( $channels ) {
	$ranked = $channels;
	usort(
		$ranked,
		static function ( $a, $b ) {
			$by = $b['responses'] <=> $a['responses'];
			return 0 !== $by ? $by : $b['revenue'] <=> $a['revenue'];
		}
	);
	$keep = count( $ranked ) > 8 ? 7 : 8;
	$out  = array();
	foreach ( $ranked as $i => $c ) {
		$out[ $c['answer_id'] ] = $i < $keep ? 'var(--ss-cat-' . ( $i + 1 ) . ')' : 'var(--ss-cat-rest)';
	}
	return $out;
}

/**
 * Empty state: what is missing and the one next step.
 *
 * @param string $title  Heading.
 * @param string $text   Explanation.
 * @param string $button Button label.
 * @param string $url    Button link.
 * @return void
 */
function sourcesay_widget_empty( $title, $text, $button, $url ) {
	echo '<div class="ss-w-empty"><span class="ss-w-empty__icon">' . sourcesay_widget_icon( 'chart' ) . '</span><div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- icon markup is escaped in sourcesay_widget_icon().
	echo '<h3 class="ss-w-empty__title">' . esc_html( $title ) . '</h3><p>' . esc_html( $text ) . '</p>';
	echo '<a class="ss-w-btn" href="' . esc_url( $url ) . '">' . esc_html( $button ) . '</a></div></div></div>';
}

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
	$prev     = isset( $report['previous']['totals'] ) ? $report['previous']['totals'] : array();
	$prev     = wp_parse_args(
		$prev,
		array(
			'paid_orders'   => 0,
			'response_rate' => 0,
			'revenue'       => 0,
		)
	);

	echo '<div class="sourcesay ss-widget">';
	if ( empty( $settings['enabled'] ) && 0 === $totals['responses'] ) {
		sourcesay_widget_empty(
			__( 'Your survey is turned off', 'sourcesay' ),
			__( 'Customers do not see the question yet. Turn the survey on and the channels that bring you orders show up here.', 'sourcesay' ),
			__( 'Turn on the survey', 'sourcesay' ),
			$link . '#survey'
		);
		return;
	}
	if ( 0 === $totals['responses'] ) {
		sourcesay_widget_empty(
			__( 'No answers in the last 30 days', 'sourcesay' ),
			__( 'Customers see the question on the order confirmation page after they pay, so answers arrive with your next orders. Check how it looks in the survey preview.', 'sourcesay' ),
			__( 'Preview the survey', 'sourcesay' ),
			$link . '#survey'
		);
		return;
	}

	$rate = number_format_i18n( $totals['response_rate'] * 100, 0 ) . '%';
	$kpis = array(
		array(
			'tone'  => 'yellow',
			'icon'  => 'percent',
			'label' => __( 'Response rate', 'sourcesay' ),
			'value' => esc_html( $rate ),
			'delta' => sourcesay_widget_delta( $totals['response_rate'], $prev['response_rate'], true, (int) $prev['paid_orders'], number_format_i18n( $prev['response_rate'] * 100, 0 ) . '%' ),
			/* translators: 1: number of answers, 2: number of paid orders. */
			'meta'  => sprintf( _n( '%1$s answer from %2$s paid orders', '%1$s answers from %2$s paid orders', $totals['responses'], 'sourcesay' ), number_format_i18n( $totals['responses'] ), number_format_i18n( $totals['paid_orders'] ) ),
		),
		array(
			'tone'  => 'green',
			'icon'  => 'revenue',
			'label' => __( 'Revenue from answered orders', 'sourcesay' ),
			'value' => wp_kses_post( wc_price( $totals['revenue'] ) ),
			'delta' => sourcesay_widget_delta( $totals['revenue'], $prev['revenue'], false, 0, html_entity_decode( wp_strip_all_tags( wc_price( $prev['revenue'] ) ), ENT_QUOTES, 'UTF-8' ) ),
			'meta'  => __( 'Paid orders, minus refunds', 'sourcesay' ),
		),
	);
	echo '<div class="ss-w-tiles">';
	foreach ( $kpis as $k ) {
		echo '<div class="ss-w-tile ss-w-tile--' . esc_attr( $k['tone'] ) . '"><span class="ss-w-tile__head"><span class="ss-w-tile__label">' . esc_html( $k['label'] ) . '</span><span class="ss-w-tile__icon">' . sourcesay_widget_icon( $k['icon'] ) . '</span></span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- icon markup is escaped in sourcesay_widget_icon().
		echo '<span class="ss-w-tile__value">' . $k['value'] . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
		echo '<span class="ss-w-tile__change">' . $k['delta'] . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in sourcesay_widget_delta().
		echo '<span class="ss-w-tile__meta">' . esc_html( $k['meta'] ) . '</span></div>';
	}
	echo '</div>';

	// Top 5 channels by revenue (the report is already sorted that way). They own their Reports colours.
	$colors  = sourcesay_widget_colors( $report['channels'] );
	$top     = array_slice( $report['channels'], 0, 5 );
	$answers = max( 1, (int) $totals['responses'] );
	$max_rev = max( 0.01, max( array_map( 'floatval', wp_list_pluck( $top, 'revenue' ) ) ) );

	// Where answers come from: the top channels in answer order, every other channel folded into one grey block.
	$segs = $top;
	usort(
		$segs,
		static function ( $a, $b ) {
			return $b['responses'] <=> $a['responses'];
		}
	);
	$rest = $answers - array_sum( wp_list_pluck( $top, 'responses' ) );
	echo '<div class="ss-share ss-w-share"><div class="ss-share__head"><h3 class="ss-share__title">' . esc_html__( 'Where answers come from', 'sourcesay' ) . '</h3><span class="ss-share__note">';
	/* translators: %s: number of answers. */
	echo esc_html( sprintf( _n( 'Share of %s answer', 'Share of %s answers', $answers, 'sourcesay' ), number_format_i18n( $answers ) ) );
	echo '</span></div><div class="ss-share__bar" aria-hidden="true">';
	foreach ( $segs as $i => $c ) {
		echo '<span class="ss-share__seg" title="' . esc_attr( $c['label'] . ': ' . number_format_i18n( $c['responses'] / $answers * 100, 0 ) . '%' ) . '" style="' . esc_attr( '--ss-c:' . $colors[ $c['answer_id'] ] . ';--ss-i:' . $i . ';flex:' . (int) $c['responses'] . ' 1 0' ) . '"></span>';
	}
	if ( $rest > 0 ) {
		echo '<span class="ss-share__seg" style="' . esc_attr( '--ss-i:' . count( $segs ) . ';flex:' . (int) $rest . ' 1 0' ) . '"></span>';
	}
	echo '</div>';
	if ( $rest > 0 ) {
		$more = count( $report['channels'] ) - count( $top );
		/* translators: 1: number of smaller channels, 2: their share of answers. */
		$note = sprintf( _n( '%1$s more channel: %2$s', '%1$s more channels: %2$s', $more, 'sourcesay' ), number_format_i18n( $more ), number_format_i18n( $rest / $answers * 100, 0 ) . '%' );
		echo '<p class="ss-w-share__rest"><span class="ss-swatch" aria-hidden="true"></span>' . esc_html( $note ) . '</p>';
	}
	echo '</div>';

	echo '<h3 class="ss-w-title">' . esc_html__( 'Top channels by revenue', 'sourcesay' ) . '</h3><ol class="ss-w-chans">';
	foreach ( $top as $i => $c ) {
		// Bar length: this channel's revenue against the top channel's, from zero.
		$w    = round( max( 0, (float) $c['revenue'] ) / $max_rev * 100, 1 );
		$w    = $c['revenue'] > 0 ? max( 2, $w ) : 0;
		$logo = sourcesay_answer_logo(
			array(
				'answer_id'    => $c['answer_id'],
				'answer_label' => $c['label'],
			)
		);
		/* translators: 1: number of answers, 2: share of all answers. */
		$sub = sprintf( _n( '%1$s answer (%2$s)', '%1$s answers (%2$s)', $c['responses'], 'sourcesay' ), number_format_i18n( $c['responses'] ), number_format_i18n( $c['responses'] / $answers * 100, 0 ) . '%' );
		echo '<li class="ss-w-chan" style="' . esc_attr( '--ss-c:' . $colors[ $c['answer_id'] ] . ';--ss-i:' . $i ) . '">' . $logo; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- logo markup is escaped in sourcesay_logo_html().
		echo '<span class="ss-w-chan__main"><span class="ss-w-chan__name">' . esc_html( $c['label'] ) . '</span><span class="ss-w-chan__bar" aria-hidden="true"><span style="' . esc_attr( 'width:' . $w . '%' ) . '"></span></span></span>';
		echo '<span class="ss-w-chan__nums"><strong>' . wp_kses_post( wc_price( $c['revenue'] ) ) . '</strong><span>' . esc_html( $sub ) . '</span></span></li>';
	}
	echo '</ol>';

	echo '<div class="ss-w-foot"><span>' . esc_html__( 'Last 30 days', 'sourcesay' ) . '</span><a class="ss-w-btn" href="' . esc_url( $link ) . '">' . esc_html__( 'See the full report', 'sourcesay' ) . '</a></div></div>';
}
