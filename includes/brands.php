<?php
/**
 * Channel logos: real brand marks (assets/brands.svg) in their brand colours, outline icons for everything else.
 * Used in the Orders list ("Heard about us" + Origin columns) and the order meta box.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

require_once SOURCESAY_PATH . 'includes/brand-data.php';

/**
 * Brand key for a text such as a WooCommerce utm_source ("fb", "l.instagram.com", "Google") or an answer icon key.
 *
 * @param string $text Source text.
 * @return string Brand key, or '' when no brand matches.
 */
function sourcesay_brand_key( $text ) {
	$t = strtolower( trim( (string) $text ) );
	if ( '' === $t ) {
		return '';
	}
	$brands = sourcesay_brand_data();
	if ( isset( $brands[ $t ] ) ) {
		return $t;
	}
	// Host or name: drop scheme, path, www./m./l./lm. and the TLD, then try aliases.
	$t       = preg_replace( '#^[a-z]+://#', '', $t );
	$t       = preg_replace( '#[/?].*$#', '', $t );
	$t       = preg_replace( '#^(www|m|l|lm|mobile|web)\.#', '', $t );
	$aliases = array(
		'fb'                 => 'facebook',
		'facebook.com'       => 'facebook',
		'ig'                 => 'instagram',
		'insta'              => 'instagram',
		'instagram.com'      => 'instagram',
		'yt'                 => 'youtube',
		'youtu.be'           => 'youtube',
		'twitter'            => 'x',
		't.co'               => 'x',
		'x.com'              => 'x',
		'twitter.com'        => 'x',
		'pin.it'             => 'pinterest',
		'lnkd.in'            => 'linkedin',
		'chat.openai.com'    => 'chatgpt',
		'chatgpt.com'        => 'chatgpt',
		'openai'             => 'chatgpt',
		'bard'               => 'gemini',
		'gemini.google.com'  => 'gemini',
		'claude.ai'          => 'claude',
		'perplexity.ai'      => 'perplexity',
		'googleads'          => 'google',
		'adwords'            => 'google',
		'google ads'         => 'google',
		'apple podcasts'     => 'apple-podcasts',
		'podcasts.apple.com' => 'apple-podcasts',
		'wa.me'              => 'whatsapp',
		't.me'               => 'telegram',
		'snap'               => 'snapchat',
	);
	if ( isset( $aliases[ $t ] ) ) {
		return $aliases[ $t ];
	}
	$name = preg_replace( '#\.[a-z.]{2,6}$#', '', $t ); // "pinterest.co.uk" -> "pinterest".
	$name = preg_replace( '#[^a-z0-9-]#', '', $name );
	if ( isset( $brands[ $name ] ) ) {
		return $name;
	}
	return isset( $aliases[ $name ] ) ? $aliases[ $name ] : '';
}

/**
 * Logo markup: the brand mark in its colour, or an outline icon (tinted for brands without a shipped mark).
 *
 * @param string $brand Brand key from sourcesay_brand_key(), or ''.
 * @param string $icon  Outline icon key (icons.svg) used when there is no brand.
 * @return string Safe HTML.
 */
function sourcesay_logo_html( $brand, $icon = 'tag' ) {
	$brands = sourcesay_brand_data();
	if ( '' !== $brand && isset( $brands[ $brand ] ) ) {
		list( , $color, $fallback ) = $brands[ $brand ];
		$href                       = '' === $fallback ? SOURCESAY_URL . 'assets/brands.svg#ss-b-' . $brand : SOURCESAY_URL . 'assets/icons.svg#ss-i-' . $fallback;
		// Very light brand colours (Snapchat yellow, Spotify green...) sit on a dark tile so the mark stays visible.
		$rgb   = sscanf( $color, '#%02x%02x%02x' );
		$light = ( 0.2126 * $rgb[0] + 0.7152 * $rgb[1] + 0.0722 * $rgb[2] ) > 170;
		return '<span class="ss-logo' . ( $light ? ' ss-logo--tile' : '' ) . '" style="color:' . esc_attr( $color ) . '" aria-hidden="true"><svg><use href="' . esc_url( $href ) . '"></use></svg></span>';
	}
	return '<span class="ss-logo ss-logo--plain" aria-hidden="true"><svg><use href="' . esc_url( SOURCESAY_URL . 'assets/icons.svg#ss-i-' . sanitize_key( $icon ) ) . '"></use></svg></span>';
}

/**
 * Display name for a source: the brand's own spelling ("TikTok") or the source text with a capital letter.
 *
 * @param string $brand  Brand key or ''.
 * @param string $source Raw source text.
 * @return string
 */
function sourcesay_source_name( $brand, $source ) {
	$brands = sourcesay_brand_data();
	return '' !== $brand && isset( $brands[ $brand ] ) ? $brands[ $brand ][0] : ucfirst( (string) $source );
}

/**
 * Styles for the logos on the Orders list and order screen (no SourceSay stylesheet loads there).
 *
 * @return void
 */
function sourcesay_orders_logo_style() {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( ! $screen || ! in_array( $screen->id, array( 'woocommerce_page_wc-orders', 'edit-shop_order', 'shop_order' ), true ) ) {
		return;
	}
	wp_register_style( 'sourcesay-orders', false, array(), SOURCESAY_VERSION );
	wp_enqueue_style( 'sourcesay-orders' );
	wp_add_inline_style(
		'sourcesay-orders',
		'.ss-chip{display:inline-flex;align-items:center;gap:8px;line-height:1.3;vertical-align:middle}'
		. '.ss-logo{display:inline-grid;place-items:center;flex:none;width:22px;height:22px;border-radius:6px}'
		. '.ss-logo svg{width:18px;height:18px;fill:currentColor}'
		. '.ss-logo--tile{background:#1a1a1d}.ss-logo--tile svg{width:15px;height:15px}'
		. '.ss-logo--plain{background:#eef0fa;color:#3a44d6}.ss-logo--plain svg{width:15px;height:15px}'
		. '.ss-chip small{display:block;color:#646970}.ss-chip--muted{color:#646970}'
	);
}
add_action( 'admin_enqueue_scripts', 'sourcesay_orders_logo_style' );
