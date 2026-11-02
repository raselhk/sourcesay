<?php
/**
 * Report queries.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * Resolve a from/to pair (store timezone, inclusive) into dates and timestamps.
 *
 * @param string $from YYYY-MM-DD or empty.
 * @param string $to   YYYY-MM-DD or empty.
 * @return array { from, to, start (GMT datetime), end (GMT datetime), start_ts, end_ts }
 */
function sourcesay_resolve_range( $from, $to ) {
	$tz    = wp_timezone();
	$valid = static function ( $d ) use ( $tz ) {
		if ( ! is_string( $d ) || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $d ) ) {
			return null;
		}
		$dt = DateTimeImmutable::createFromFormat( '!Y-m-d', $d, $tz );
		return $dt && $dt->format( 'Y-m-d' ) === $d ? $dt : null;
	};

	$today = new DateTimeImmutable( 'today', $tz );
	$end   = $valid( $to );
	$end   = $end ? $end : $today;
	$start = $valid( $from );
	$start = $start ? $start : $end->modify( '-29 days' );
	if ( $start > $end ) {
		list( $start, $end ) = array( $end, $start );
	}
	if ( $start < $end->modify( '-730 days' ) ) {
		$start = $end->modify( '-730 days' );
	}
	$start_ts = $start->getTimestamp();
	$end_ts   = $end->setTime( 23, 59, 59 )->getTimestamp();

	return array(
		'from'     => $start->format( 'Y-m-d' ),
		'to'       => $end->format( 'Y-m-d' ),
		'start'    => gmdate( 'Y-m-d H:i:s', $start_ts ),
		'end'      => gmdate( 'Y-m-d H:i:s', $end_ts ),
		'start_ts' => $start_ts,
		'end_ts'   => $end_ts,
	);
}

/**
 * SQL fragment "status IN (%s,%s)" for paid statuses, plus its values.
 *
 * @return array [ placeholders, values ]
 */
function sourcesay_paid_in() {
	$paid = array_values( array_map( 'sanitize_key', wc_get_is_paid_statuses() ) );
	return array( implode( ',', array_fill( 0, count( $paid ), '%s' ) ), $paid );
}

/**
 * Number of paid orders created in the range (HPOS and legacy safe).
 *
 * @param array $range Resolved range.
 * @return int
 */
function sourcesay_count_paid_orders( $range ) {
	$res = wc_get_orders(
		array(
			'status'       => wc_get_is_paid_statuses(),
			'date_created' => $range['start_ts'] . '...' . $range['end_ts'],
			'limit'        => 1,
			'paginate'     => true,
			'return'       => 'ids',
			'meta_query'   => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				array(
					'key'     => '_sourcesay_test',
					'compare' => 'NOT EXISTS',
				),
			),
		)
	);
	return (int) $res->total;
}

/**
 * Currency description for the UI.
 *
 * @return array
 */
function sourcesay_currency_info() {
	return array(
		'code'     => get_woocommerce_currency(),
		'symbol'   => html_entity_decode( get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8' ),
		'decimals' => wc_get_price_decimals(),
		'position' => get_option( 'woocommerce_currency_pos', 'left' ),
		'thousand' => wc_get_price_thousand_separator(),
		'decimal'  => wc_get_price_decimal_separator(),
	);
}

/**
 * Build the attribution report.
 *
 * @param string $from YYYY-MM-DD.
 * @param string $to   YYYY-MM-DD.
 * @return array
 */
function sourcesay_get_report( $from = '', $to = '' ) {
	global $wpdb;

	$range = sourcesay_resolve_range( $from, $to );
	$ckey  = 'sourcesay_rep_' . (int) get_option( 'sourcesay_cache_v', 0 ) . '_' . md5( $range['from'] . '|' . $range['to'] . '|' . get_option( 'timezone_string' ) . get_option( 'gmt_offset' ) );
	$hit   = get_transient( $ckey );
	if ( is_array( $hit ) ) {
		return $hit;
	}

	list( $in, $paid ) = sourcesay_paid_in();
	$table             = sourcesay_table();
	$sql               = "SELECT answer_id, answer_label, followup_text, other_text, order_total, order_created, is_returning FROM %i WHERE is_test = 0 AND order_created BETWEEN %s AND %s AND order_status IN ({$in}) ORDER BY order_created DESC"; // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	$rows              = $wpdb->get_results( $wpdb->prepare( $sql, array_merge( array( $table, $range['start'], $range['end'] ), $paid ) ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare

	// Trend skeleton: one row per day.
	$trend = array();
	$tz    = wp_timezone();
	$day   = new DateTimeImmutable( $range['from'], $tz );
	$last  = new DateTimeImmutable( $range['to'], $tz );
	while ( $day <= $last ) {
		$trend[ $day->format( 'Y-m-d' ) ] = array(
			'date'      => $day->format( 'Y-m-d' ),
			'responses' => 0,
			'revenue'   => 0.0,
		);
		$day                              = $day->modify( '+1 day' );
	}

	$settings = sourcesay_get_settings();
	$meta     = array();
	foreach ( $settings['options'] as $opt ) {
		$meta[ $opt['id'] ] = array( $opt['label'], $opt['icon'] );
	}

	$chan    = array();
	$follow  = array();
	$other   = array();
	$nvr     = array(
		'new'       => array(
			'responses' => 0,
			'revenue'   => 0.0,
		),
		'returning' => array(
			'responses' => 0,
			'revenue'   => 0.0,
		),
	);
	$tot_rev = 0.0;

	foreach ( $rows as $r ) {
		$id  = $r['answer_id'];
		$rev = (float) $r['order_total'];
		if ( ! isset( $chan[ $id ] ) ) {
			if ( isset( $meta[ $id ] ) ) {
				$label = $meta[ $id ][0];
				$icon  = $meta[ $id ][1];
			} elseif ( 'other' === $id ) {
				$label = $settings['other']['label'];
				$icon  = 'question';
			} else {
				$label = $r['answer_label'];
				$icon  = '';
			}
			$chan[ $id ] = array(
				'answer_id' => $id,
				'label'     => $label,
				'icon'      => $icon,
				'responses' => 0,
				'orders'    => 0,
				'revenue'   => 0.0,
			);
		}
		++$chan[ $id ]['responses'];
		++$chan[ $id ]['orders'];
		$chan[ $id ]['revenue'] += $rev;
		$tot_rev                += $rev;

		$d = get_date_from_gmt( $r['order_created'], 'Y-m-d' );
		if ( isset( $trend[ $d ] ) ) {
			++$trend[ $d ]['responses'];
			$trend[ $d ]['revenue'] += $rev;
		}

		$k = $r['is_returning'] ? 'returning' : 'new';
		++$nvr[ $k ]['responses'];
		$nvr[ $k ]['revenue'] += $rev;

		$text = trim( (string) $r['followup_text'] );
		if ( '' !== $text ) {
			$g = function_exists( 'mb_strtolower' ) ? mb_strtolower( $text ) : strtolower( $text );
			if ( ! isset( $follow[ $id ][ $g ] ) ) {
				$follow[ $id ][ $g ] = array(
					'text'  => $text,
					'count' => 0,
				);
			}
			++$follow[ $id ][ $g ]['count'];
		}

		$o = trim( (string) $r['other_text'] );
		if ( 'other' === $id && '' !== $o && count( $other ) < 20 ) {
			$other[] = array(
				'text' => $o,
				'date' => $d,
			);
		}
	}

	$n = count( $rows );
	foreach ( $chan as &$c ) {
		$c['aov']             = round( $c['responses'] ? $c['revenue'] / $c['responses'] : 0, 2 );
		$c['share_responses'] = $n ? round( $c['responses'] / $n, 4 ) : 0.0;
		$c['share_revenue']   = $tot_rev > 0 ? round( $c['revenue'] / $tot_rev, 4 ) : 0.0;
		$c['revenue']         = round( $c['revenue'], 2 );
	}
	unset( $c );
	usort(
		$chan,
		static function ( $a, $b ) {
			$by_revenue = $b['revenue'] <=> $a['revenue'];
			return 0 !== $by_revenue ? $by_revenue : $b['responses'] <=> $a['responses'];
		}
	);

	foreach ( $follow as $id => $groups ) {
		usort(
			$groups,
			static function ( $a, $b ) {
				return $b['count'] <=> $a['count'];
			}
		);
		$follow[ $id ] = array_slice( $groups, 0, 10 );
	}

	foreach ( $trend as &$t ) {
		$t['revenue'] = round( $t['revenue'], 2 );
	}
	unset( $t );
	foreach ( $nvr as &$v ) {
		$v['revenue'] = round( $v['revenue'], 2 );
	}
	unset( $v );

	$paid_orders = sourcesay_count_paid_orders( $range );
	$report      = array(
		'range'            => array(
			'from' => $range['from'],
			'to'   => $range['to'],
		),
		'currency'         => sourcesay_currency_info(),
		'totals'           => array(
			'paid_orders'   => $paid_orders,
			'responses'     => $n,
			'response_rate' => $paid_orders ? round( min( 1, $n / $paid_orders ), 4 ) : 0.0,
			'revenue'       => round( $tot_rev, 2 ),
			'aov'           => round( $n ? $tot_rev / $n : 0, 2 ),
		),
		'channels'         => $chan,
		'trend'            => array_values( $trend ),
		'followups'        => (object) $follow,
		'other'            => $other,
		'new_vs_returning' => $nvr,
	);

	set_transient( $ckey, $report, 5 * MINUTE_IN_SECONDS );
	return $report;
}
