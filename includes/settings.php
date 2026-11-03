<?php
/**
 * Settings: defaults, presets, sanitising.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * Icon keys available in assets/icons.svg.
 *
 * @return string[]
 */
function sourcesay_icon_keys() {
	$keys = array();
	foreach ( sourcesay_icon_groups() as $group ) {
		$keys = array_merge( $keys, $group['icons'] );
	}
	return array_values( array_unique( $keys ) );
}

/**
 * Icon library grouped for the icon picker. Every key has a symbol `ss-i-<key>` in assets/icons.svg.
 *
 * @return array[] Each: label, icons (keys).
 */
function sourcesay_icon_groups() {
	return array(
		'social'    => array(
			'label' => __( 'Social media', 'sourcesay' ),
			'icons' => array( 'instagram', 'facebook', 'tiktok', 'x', 'threads', 'bluesky', 'snapchat', 'pinterest', 'linkedin', 'reddit', 'tumblr', 'mastodon' ),
		),
		'search'    => array(
			'label' => __( 'Search and AI', 'sourcesay' ),
			'icons' => array( 'google', 'ai', 'robot', 'globe' ),
		),
		'media'     => array(
			'label' => __( 'Video and audio', 'sourcesay' ),
			'icons' => array( 'youtube', 'twitch', 'vimeo', 'spotify', 'apple-podcasts', 'soundcloud', 'microphone', 'television', 'radio' ),
		),
		'messaging' => array(
			'label' => __( 'Messaging and community', 'sourcesay' ),
			'icons' => array( 'whatsapp', 'messenger', 'telegram', 'discord', 'wechat', 'slack', 'chat', 'users', 'community', 'referral' ),
		),
		'shopping'  => array(
			'label' => __( 'Marketplaces, apps and reviews', 'sourcesay' ),
			'icons' => array( 'amazon', 'etsy', 'marketplace', 'app-store', 'google-play', 'yelp', 'tripadvisor' ),
		),
		'content'   => array(
			'label' => __( 'Email and content', 'sourcesay' ),
			'icons' => array( 'envelope', 'article', 'newspaper', 'medium', 'substack', 'github', 'dribbble', 'behance' ),
		),
		'offline'   => array(
			'label' => __( 'Offline and local', 'sourcesay' ),
			'icons' => array( 'storefront', 'map-pin', 'car', 'print', 'qr-code', 'event', 'calendar', 'gift', 'phone', 'award' ),
		),
		'general'   => array(
			'label' => __( 'General', 'sourcesay' ),
			'icons' => array( 'star', 'megaphone', 'tag', 'question' ),
		),
	);
}

/**
 * Cut a string to a maximum number of characters.
 *
 * @param string $value Input.
 * @param int    $max   Max characters.
 * @return string
 */
function sourcesay_cut( $value, $max ) {
	$value = (string) $value;
	return function_exists( 'mb_substr' ) ? mb_substr( $value, 0, $max ) : substr( $value, 0, $max );
}

/**
 * Build one option object.
 *
 * @param string      $id       Option id.
 * @param string      $label    Label.
 * @param string      $icon     Icon key.
 * @param string|null $followup Follow-up question, or null for none.
 * @param bool        $fu_on    Whether the follow-up is enabled.
 * @return array
 */
function sourcesay_option( $id, $label, $icon, $followup = null, $fu_on = true ) {
	return array(
		'id'       => $id,
		'label'    => $label,
		'icon'     => $icon,
		'enabled'  => true,
		'followup' => array(
			'enabled'     => null !== $followup && $fu_on,
			'question'    => (string) $followup,
			'placeholder' => '',
		),
	);
}

/**
 * Default option list.
 *
 * @return array
 */
function sourcesay_default_options() {
	return array(
		sourcesay_option( 'google', __( 'Google search', 'sourcesay' ), 'google' ),
		sourcesay_option( 'ai', __( 'AI assistant (ChatGPT, Perplexity)', 'sourcesay' ), 'ai', __( 'Which one?', 'sourcesay' ), false ),
		sourcesay_option( 'instagram', __( 'Instagram', 'sourcesay' ), 'instagram' ),
		sourcesay_option( 'facebook', __( 'Facebook', 'sourcesay' ), 'facebook' ),
		sourcesay_option( 'tiktok', __( 'TikTok', 'sourcesay' ), 'tiktok' ),
		sourcesay_option( 'youtube', __( 'YouTube', 'sourcesay' ), 'youtube' ),
		sourcesay_option( 'friend', __( 'Friend or family', 'sourcesay' ), 'users', __( 'Who should we thank?', 'sourcesay' ), false ),
		sourcesay_option( 'podcast', __( 'Podcast', 'sourcesay' ), 'microphone', __( 'Which podcast?', 'sourcesay' ) ),
		sourcesay_option( 'influencer', __( 'Influencer or creator', 'sourcesay' ), 'star', __( 'Who was it?', 'sourcesay' ) ),
		sourcesay_option( 'email', __( 'Email or newsletter', 'sourcesay' ), 'envelope' ),
		sourcesay_option( 'blog', __( 'Blog or article', 'sourcesay' ), 'article' ),
		sourcesay_option( 'ad', __( 'Online ad', 'sourcesay' ), 'megaphone' ),
	);
}

/**
 * Default settings.
 *
 * @return array
 */
function sourcesay_default_settings() {
	$defaults = array(
		// Off until the store owner turns it on (setup step 3 or the Survey tab); test orders still show it.
		'enabled'             => false,
		'question'            => __( 'How did you hear about us?', 'sourcesay' ),
		'options'             => sourcesay_default_options(),
		'other'               => array(
			'enabled'     => true,
			'label'       => __( 'Other', 'sourcesay' ),
			'placeholder' => __( 'Tell us where', 'sourcesay' ),
		),
		'shuffle'             => true,
		'position'            => 'after',
		'layout'              => 'buttons',
		'accent'              => '',
		'thank_you'           => __( 'Thanks, that really helps!', 'sourcesay' ),
		'show_in_account'     => true,
		'retention_days'      => 0,
		'delete_on_uninstall' => false,
		'placement'           => 'auto',
		'audience'            => 'all',
		'allow_skip'          => true,
		'skip_label'          => __( 'Prefer not to say', 'sourcesay' ),
	);
	foreach ( sourcesay_settings_schema() as $key => $def ) {
		if ( ! array_key_exists( $key, $defaults ) ) {
			$defaults[ $key ] = $def['default'];
		}
	}
	return $defaults;
}

/**
 * Extra settings keys added by extensions through the sourcesay_settings_schema filter.
 * Each entry: key => array( 'default' => mixed, 'sanitize' => callable( $value, $raw ) ).
 * Core keys cannot be replaced, and a key without a callable sanitizer always saves its default.
 *
 * @return array
 */
function sourcesay_settings_schema() {
	$schema = array();
	foreach ( (array) apply_filters( 'sourcesay_settings_schema', array() ) as $key => $def ) {
		if ( is_string( $key ) && sanitize_key( $key ) === $key && is_array( $def ) && array_key_exists( 'default', $def ) ) {
			$schema[ $key ] = $def;
		}
	}
	return $schema;
}

/**
 * Starter option sets.
 *
 * @return array
 */
function sourcesay_presets() {
	$general = sourcesay_default_options();

	$fashion = $general;
	array_unshift( $fashion, sourcesay_option( 'influencer', __( 'Influencer or creator', 'sourcesay' ), 'star', __( 'Who was it?', 'sourcesay' ) ) );
	$fashion   = array_values(
		array_filter(
			$fashion,
			static function ( $o ) {
				static $seen = array();
				if ( isset( $seen[ $o['id'] ] ) ) {
					return false;
				}
				$seen[ $o['id'] ] = true;
				return true;
			}
		)
	);
	$fashion[] = sourcesay_option( 'pinterest', __( 'Pinterest', 'sourcesay' ), 'pinterest' );

	$b2b = array(
		sourcesay_option( 'google', __( 'Google search', 'sourcesay' ), 'google' ),
		sourcesay_option( 'linkedin', __( 'LinkedIn', 'sourcesay' ), 'linkedin' ),
		sourcesay_option( 'referral', __( 'Colleague or referral', 'sourcesay' ), 'users', __( 'Who referred you?', 'sourcesay' ), false ),
		sourcesay_option( 'event', __( 'Trade show or event', 'sourcesay' ), 'calendar', __( 'Which event?', 'sourcesay' ) ),
		sourcesay_option( 'podcast', __( 'Podcast', 'sourcesay' ), 'microphone', __( 'Which podcast?', 'sourcesay' ) ),
		sourcesay_option( 'email', __( 'Email or newsletter', 'sourcesay' ), 'envelope' ),
		sourcesay_option( 'blog', __( 'Blog or article', 'sourcesay' ), 'article' ),
	);

	$local = array(
		sourcesay_option( 'google', __( 'Google search or Maps', 'sourcesay' ), 'google' ),
		sourcesay_option( 'friend', __( 'Friend or family', 'sourcesay' ), 'users', __( 'Who should we thank?', 'sourcesay' ), false ),
		sourcesay_option( 'facebook', __( 'Facebook', 'sourcesay' ), 'facebook' ),
		sourcesay_option( 'instagram', __( 'Instagram', 'sourcesay' ), 'instagram' ),
		sourcesay_option( 'walk', __( 'Walked or drove by', 'sourcesay' ), 'map-pin' ),
		sourcesay_option( 'flyer', __( 'Flyer or print', 'sourcesay' ), 'newspaper' ),
		sourcesay_option( 'radio', __( 'Radio or TV', 'sourcesay' ), 'radio' ),
	);

	return array(
		'general' => $general,
		'fashion' => $fashion,
		'b2b'     => $b2b,
		'local'   => $local,
	);
}

/**
 * Stored settings merged over the defaults.
 *
 * @return array
 */
function sourcesay_get_settings() {
	$stored = get_option( 'sourcesay_settings', array() );
	return array_merge( sourcesay_default_settings(), is_array( $stored ) ? $stored : array() );
}

/**
 * Sanitise a settings array. Unknown keys are dropped.
 *
 * @param array $raw Raw input.
 * @return array
 */
function sourcesay_sanitize_settings( $raw ) {
	$raw      = is_array( $raw ) ? $raw : array();
	$defaults = sourcesay_default_settings();
	$raw      = array_merge( $defaults, $raw );
	$text     = static function ( $v, $max ) {
		return sourcesay_cut( sanitize_text_field( is_scalar( $v ) ? (string) $v : '' ), $max );
	};
	$bool     = static function ( $v ) {
		return wp_validate_boolean( $v );
	};

	$question = $text( $raw['question'], 160 );
	$clean    = array(
		'enabled'  => $bool( $raw['enabled'] ),
		'question' => '' === $question ? $defaults['question'] : $question,
	);

	$icons   = sourcesay_icon_keys();
	$options = array();
	$seen    = array();
	foreach ( is_array( $raw['options'] ) ? $raw['options'] : array() as $opt ) {
		if ( count( $options ) >= 20 ) {
			break;
		}
		if ( ! is_array( $opt ) ) {
			continue;
		}
		$id    = sanitize_key( isset( $opt['id'] ) && is_scalar( $opt['id'] ) ? $opt['id'] : '' );
		$id    = sourcesay_cut( $id, 64 );
		$label = $text( isset( $opt['label'] ) ? $opt['label'] : '', 60 );
		if ( '' === $id || 'other' === $id || '' === $label || isset( $seen[ $id ] ) ) {
			continue;
		}
		$seen[ $id ] = true;
		$icon        = isset( $opt['icon'] ) && is_scalar( $opt['icon'] ) ? (string) $opt['icon'] : '';
		$fu          = isset( $opt['followup'] ) && is_array( $opt['followup'] ) ? $opt['followup'] : array();
		$options[]   = array(
			'id'       => $id,
			'label'    => $label,
			'icon'     => in_array( $icon, $icons, true ) ? $icon : '',
			'enabled'  => isset( $opt['enabled'] ) ? $bool( $opt['enabled'] ) : true,
			'followup' => array(
				'enabled'     => isset( $fu['enabled'] ) ? $bool( $fu['enabled'] ) : false,
				'question'    => $text( isset( $fu['question'] ) ? $fu['question'] : '', 120 ),
				'placeholder' => $text( isset( $fu['placeholder'] ) ? $fu['placeholder'] : '', 80 ),
			),
		);
	}
	$clean['options'] = $options;

	$other          = is_array( $raw['other'] ) ? $raw['other'] : array();
	$clean['other'] = array(
		'enabled'     => isset( $other['enabled'] ) ? $bool( $other['enabled'] ) : true,
		'label'       => $text( isset( $other['label'] ) ? $other['label'] : '', 60 ),
		'placeholder' => $text( isset( $other['placeholder'] ) ? $other['placeholder'] : '', 80 ),
	);
	if ( '' === $clean['other']['label'] ) {
		$clean['other']['label'] = $defaults['other']['label'];
	}

	$clean['shuffle']  = $bool( $raw['shuffle'] );
	$clean['position'] = in_array( $raw['position'], array( 'after', 'before' ), true ) ? $raw['position'] : 'after';
	$clean['layout']   = in_array( $raw['layout'], array( 'buttons', 'list' ), true ) ? $raw['layout'] : 'buttons';
	$accent            = is_scalar( $raw['accent'] ) ? sanitize_hex_color( (string) $raw['accent'] ) : '';
	$clean['accent']   = $accent ? $accent : '';
	$thank_you         = $text( $raw['thank_you'], 120 );

	$clean['thank_you']           = '' === $thank_you ? $defaults['thank_you'] : $thank_you;
	$clean['show_in_account']     = $bool( $raw['show_in_account'] );
	$clean['retention_days']      = min( 3650, max( 0, (int) $raw['retention_days'] ) );
	$clean['delete_on_uninstall'] = $bool( $raw['delete_on_uninstall'] );
	$clean['placement']           = in_array( $raw['placement'], array( 'auto', 'manual' ), true ) ? $raw['placement'] : 'auto';
	$clean['audience']            = in_array( $raw['audience'], array( 'all', 'new' ), true ) ? $raw['audience'] : 'all';
	$clean['allow_skip']          = $bool( $raw['allow_skip'] );
	$skip_label                   = $text( $raw['skip_label'], 40 );
	$clean['skip_label']          = '' === $skip_label ? $defaults['skip_label'] : $skip_label;

	foreach ( sourcesay_settings_schema() as $key => $def ) {
		if ( ! array_key_exists( $key, $clean ) ) {
			$clean[ $key ] = isset( $def['sanitize'] ) && is_callable( $def['sanitize'] ) ? call_user_func( $def['sanitize'], $raw[ $key ], $raw ) : $def['default'];
		}
	}

	return $clean;
}

/**
 * Find an enabled option by id.
 *
 * @param string $id       Option id.
 * @param array  $settings Settings.
 * @return array|null
 */
function sourcesay_find_option( $id, $settings ) {
	foreach ( $settings['options'] as $opt ) {
		if ( $opt['id'] === $id && ! empty( $opt['enabled'] ) ) {
			return $opt;
		}
	}
	return null;
}
