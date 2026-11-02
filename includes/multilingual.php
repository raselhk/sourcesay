<?php
/**
 * WPML and Polylang string translation. No hard dependency on either plugin.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * Which translation plugin is active?
 *
 * @return string|null wpml|polylang|null
 */
function sourcesay_translation_plugin() {
	if ( defined( 'ICL_SITEPRESS_VERSION' ) || has_filter( 'wpml_translate_single_string' ) ) {
		return 'wpml';
	}
	if ( function_exists( 'pll__' ) && function_exists( 'pll_register_string' ) ) {
		return 'polylang';
	}
	return null;
}

/**
 * Every customer-facing string: name => value.
 *
 * @param array $settings Settings.
 * @return array
 */
function sourcesay_translatable_strings( $settings ) {
	$out = array(
		'question'          => $settings['question'],
		'other_label'       => $settings['other']['label'],
		'other_placeholder' => $settings['other']['placeholder'],
		'thank_you'         => $settings['thank_you'],
		'skip_label'        => $settings['skip_label'],
	);
	foreach ( $settings['options'] as $opt ) {
		$out[ 'option_' . $opt['id'] . '_label' ]       = $opt['label'];
		$out[ 'option_' . $opt['id'] . '_followup' ]    = $opt['followup']['question'];
		$out[ 'option_' . $opt['id'] . '_placeholder' ] = $opt['followup']['placeholder'];
	}
	return array_filter(
		$out,
		static function ( $v ) {
			return '' !== (string) $v;
		}
	);
}

/**
 * Register the strings with WPML (context "SourceSay") and Polylang (group "SourceSay").
 *
 * @param array|null $settings Settings (default: stored).
 * @return void
 */
function sourcesay_register_strings( $settings = null ) {
	$plugin = sourcesay_translation_plugin();
	if ( ! $plugin ) {
		return;
	}
	$settings = is_array( $settings ) ? $settings : sourcesay_get_settings();
	foreach ( sourcesay_translatable_strings( $settings ) as $name => $value ) {
		if ( 'wpml' === $plugin ) {
			do_action( 'wpml_register_single_string', 'SourceSay', $name, $value ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WPML API.
		} else {
			pll_register_string( $name, $value, 'SourceSay' );
		}
	}
}

/**
 * Register on settings save.
 *
 * @param mixed $old Old value.
 * @param mixed $new New value.
 * @return void
 */
function sourcesay_register_strings_on_save( $old, $new ) {
	unset( $old );
	if ( is_array( $new ) ) {
		sourcesay_register_strings( array_merge( sourcesay_default_settings(), $new ) );
	}
}
add_action( 'update_option_sourcesay_settings', 'sourcesay_register_strings_on_save', 10, 2 );

/**
 * Register on admin_init, but only when the strings or the translation plugin changed.
 *
 * @return void
 */
function sourcesay_register_strings_admin_init() {
	$plugin = sourcesay_translation_plugin();
	if ( ! $plugin ) {
		return;
	}
	$hash = md5( $plugin . wp_json_encode( sourcesay_translatable_strings( sourcesay_get_settings() ) ) );
	if ( get_option( 'sourcesay_i18n_hash' ) !== $hash ) {
		sourcesay_register_strings();
		update_option( 'sourcesay_i18n_hash', $hash, false );
	}
}
add_action( 'admin_init', 'sourcesay_register_strings_admin_init' );

/**
 * Translate one string for the current language.
 *
 * @param string $name  String name.
 * @param string $value Original value.
 * @return string
 */
function sourcesay_t( $name, $value ) {
	$plugin = sourcesay_translation_plugin();
	if ( '' === (string) $value || ! $plugin ) {
		return $value;
	}
	if ( 'wpml' === $plugin ) {
		$translated = apply_filters( 'wpml_translate_single_string', $value, 'SourceSay', $name ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WPML API.
	} else {
		$translated = pll__( $value );
	}
	return is_string( $translated ) && '' !== $translated ? $translated : $value;
}

/**
 * Settings with every customer-facing string translated. Used at render time only.
 *
 * @param array $settings Settings.
 * @return array
 */
function sourcesay_translate_settings( $settings ) {
	if ( ! sourcesay_translation_plugin() ) {
		return $settings;
	}
	$settings['question']             = sourcesay_t( 'question', $settings['question'] );
	$settings['thank_you']            = sourcesay_t( 'thank_you', $settings['thank_you'] );
	$settings['skip_label']           = sourcesay_t( 'skip_label', $settings['skip_label'] );
	$settings['other']['label']       = sourcesay_t( 'other_label', $settings['other']['label'] );
	$settings['other']['placeholder'] = sourcesay_t( 'other_placeholder', $settings['other']['placeholder'] );
	foreach ( $settings['options'] as $i => $opt ) {
		$settings['options'][ $i ]['label']                   = sourcesay_t( 'option_' . $opt['id'] . '_label', $opt['label'] );
		$settings['options'][ $i ]['followup']['question']    = sourcesay_t( 'option_' . $opt['id'] . '_followup', $opt['followup']['question'] );
		$settings['options'][ $i ]['followup']['placeholder'] = sourcesay_t( 'option_' . $opt['id'] . '_placeholder', $opt['followup']['placeholder'] );
	}
	return $settings;
}
