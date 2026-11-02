<?php
/**
 * Survey markup for the thank-you page and My Account > View order.
 *
 * @package SourceSay
 */

defined( 'ABSPATH' ) || exit;

/**
 * Allowed tags for the inline SVG icon references.
 *
 * @return array
 */
function sourcesay_svg_kses() {
	return array(
		'svg' => array(
			'class'       => true,
			'aria-hidden' => true,
			'focusable'   => true,
			'width'       => true,
			'height'      => true,
		),
		'use' => array(
			'href' => true,
		),
	);
}

/**
 * One icon from the sprite, as a safe SVG <use> reference.
 *
 * @param string $key Icon key.
 * @return string
 */
function sourcesay_icon_svg( $key ) {
	$key = sanitize_key( $key );
	if ( '' === $key || ! defined( 'SOURCESAY_URL' ) ) {
		return '';
	}
	$svg = '<svg class="ss-icon" aria-hidden="true" focusable="false"><use href="' . esc_url( SOURCESAY_URL . 'assets/icons.svg#ss-i-' . $key ) . '"></use></svg>';
	return wp_kses( $svg, sourcesay_svg_kses() );
}

/**
 * Render the "How did you hear about us?" survey.
 *
 * @param WC_Order $order    Order being thanked.
 * @param array    $settings Settings from sourcesay_get_settings().
 * @param string   $context  "thankyou" | "account".
 * @return string Escaped HTML.
 */
function sourcesay_render_survey( WC_Order $order, array $settings, string $context ): string {
	$order_id = (int) $order->get_id();
	$context  = in_array( $context, array( 'thankyou', 'account', 'nojs' ), true ) ? $context : 'thankyou';
	$layout   = ( isset( $settings['layout'] ) && 'list' === $settings['layout'] ) ? 'list' : 'buttons';
	$accent   = isset( $settings['accent'] ) ? sanitize_hex_color( (string) $settings['accent'] ) : '';
	$style    = $accent ? ' style="' . esc_attr( '--ss-accent:' . $accent ) . '"' : '';
	$classes  = 'sourcesay ss-survey ss-layout-' . $layout;
	$thanks   = isset( $settings['thank_you'] ) && '' !== $settings['thank_you'] ? (string) $settings['thank_you'] : __( 'Thanks, that really helps!', 'sourcesay' );

	// Thank-you state after the no-JS form redirects back.
	$flag = isset( $_GET['sourcesay'] ) ? sanitize_key( wp_unslash( $_GET['sourcesay'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display flag only.
	if ( 'thanks' === $flag ) {
		return '<section class="' . esc_attr( $classes . ' is-done' ) . '"' . $style . ' aria-live="polite">'
			. '<p class="ss-done"><span class="ss-done__icon">' . sourcesay_icon_svg( 'check' ) . '</span>'
			. '<span class="ss-done__text">' . esc_html( $thanks ) . '</span></p></section>';
	}

	// Enabled options, shuffled per order (stable across reloads), "Other" always last.
	$valid_icons = function_exists( 'sourcesay_icon_keys' ) ? sourcesay_icon_keys() : array();
	$options     = array();
	foreach ( (array) ( $settings['options'] ?? array() ) as $opt ) {
		if ( empty( $opt['enabled'] ) || empty( $opt['id'] ) || ! isset( $opt['label'] ) || '' === $opt['label'] ) {
			continue;
		}
		$options[] = $opt;
	}
	if ( ! empty( $settings['shuffle'] ) && count( $options ) > 1 ) {
		usort(
			$options,
			static function ( $a, $b ) use ( $order_id ) {
				return crc32( $order_id . '|' . $a['id'] ) <=> crc32( $order_id . '|' . $b['id'] );
			}
		);
	}
	$other = isset( $settings['other'] ) && is_array( $settings['other'] ) ? $settings['other'] : array();
	if ( ! empty( $other['enabled'] ) ) {
		$options[] = array(
			'id'          => 'other',
			'label'       => '' !== ( $other['label'] ?? '' ) ? $other['label'] : __( 'Other', 'sourcesay' ),
			'icon'        => 'question',
			'is_other'    => true,
			'placeholder' => $other['placeholder'] ?? '',
		);
	}

	$uid      = 'ss-' . $order_id . '-' . $context;
	$question = '' !== ( $settings['question'] ?? '' ) ? (string) $settings['question'] : __( 'How did you hear about us?', 'sourcesay' );
	$data     = array(
		'rest'     => rest_url( 'sourcesay/v1/response' ),
		'orderId'  => $order_id,
		'orderKey' => $order->get_order_key(),
		'context'  => $context,
		'thankYou' => $thanks,
	);
	$i18n     = array(
		'sending' => __( 'Sending your answer…', 'sourcesay' ),
		'error'   => __( 'Your answer did not go through. Check your connection and try again.', 'sourcesay' ),
		'limit'   => __( 'Too many tries in a short time. Please try again in a few minutes.', 'sourcesay' ),
		'retry'   => __( 'Try again', 'sourcesay' ),
		'detail'  => __( 'Anything to add? (optional)', 'sourcesay' ),
		'sprite'  => defined( 'SOURCESAY_URL' ) ? SOURCESAY_URL . 'assets/icons.svg' : '',
	);

	ob_start();
	?>
<section class="<?php echo esc_attr( $classes ); ?>" id="<?php echo esc_attr( $uid ); ?>" aria-labelledby="<?php echo esc_attr( $uid . '-q' ); ?>" data-sourcesay="<?php echo esc_attr( wp_json_encode( $data ) ); ?>" data-sourcesay-ui="<?php echo esc_attr( wp_json_encode( $i18n ) ); ?>"<?php echo $style; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built with esc_attr above. ?>>
	<form class="ss-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<input type="hidden" name="action" value="sourcesay_submit">
		<input type="hidden" name="order_id" value="<?php echo esc_attr( (string) $order_id ); ?>">
		<input type="hidden" name="order_key" value="<?php echo esc_attr( $order->get_order_key() ); ?>">
		<input type="hidden" name="context" value="<?php echo esc_attr( $context ); ?>">
		<div class="ss-hp" aria-hidden="true">
			<label for="<?php echo esc_attr( $uid . '-hp' ); ?>"><?php esc_html_e( 'Leave this field empty', 'sourcesay' ); ?></label>
			<input type="text" id="<?php echo esc_attr( $uid . '-hp' ); ?>" name="ss_website" value="" tabindex="-1" autocomplete="off">
		</div>
		<fieldset class="ss-fieldset" aria-describedby="<?php echo esc_attr( $uid . '-hint' ); ?>">
			<legend class="ss-question" id="<?php echo esc_attr( $uid . '-q' ); ?>"><?php echo esc_html( $question ); ?></legend>
			<p class="ss-hint" id="<?php echo esc_attr( $uid . '-hint' ); ?>"><?php esc_html_e( 'Optional. Pick the one that fits best.', 'sourcesay' ); ?></p>
			<div class="ss-options">
				<?php
				foreach ( $options as $opt ) :
					$is_other = ! empty( $opt['is_other'] );
					$fu       = ( ! $is_other && ! empty( $opt['followup']['enabled'] ) && '' !== ( $opt['followup']['question'] ?? '' ) ) ? $opt['followup'] : null;
					$icon     = isset( $opt['icon'] ) ? (string) $opt['icon'] : '';
					if ( $valid_icons && ! in_array( $icon, $valid_icons, true ) ) {
						$icon = '';
					}
					?>
				<label class="ss-option">
					<input class="ss-radio" type="radio" name="answer_id" value="<?php echo esc_attr( $opt['id'] ); ?>"
					<?php
					if ( $is_other ) {
						echo ' data-other="1"';
					} elseif ( $fu ) {
						echo ' data-followup="' . esc_attr( $fu['question'] ) . '" data-placeholder="' . esc_attr( $fu['placeholder'] ?? '' ) . '"';
					}
					?>
					>
					<span class="ss-option__box">
						<?php echo sourcesay_icon_svg( $icon ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_kses allow-list. ?>
						<span class="ss-option__label"><?php echo esc_html( $opt['label'] ); ?></span>
						<span class="ss-option__dot" aria-hidden="true"></span>
					</span>
				</label>
				<?php endforeach; ?>
			</div>
		</fieldset>
		<div class="ss-more">
			<div class="ss-field ss-field--followup">
				<label class="ss-field__label" for="<?php echo esc_attr( $uid . '-fu' ); ?>"><?php echo esc_html( $i18n['detail'] ); ?></label>
				<input class="ss-input" type="text" id="<?php echo esc_attr( $uid . '-fu' ); ?>" name="followup_text" maxlength="500" autocomplete="off">
			</div>
			<?php if ( ! empty( $other['enabled'] ) ) : ?>
			<div class="ss-field ss-field--other">
				<label class="ss-field__label" for="<?php echo esc_attr( $uid . '-other' ); ?>"><?php echo esc_html( '' !== ( $other['placeholder'] ?? '' ) ? $other['placeholder'] : __( 'Tell us where', 'sourcesay' ) ); ?></label>
				<input class="ss-input" type="text" id="<?php echo esc_attr( $uid . '-other' ); ?>" name="other_text" maxlength="500" autocomplete="off">
			</div>
			<?php endif; ?>
			<button type="submit" class="ss-send"><span><?php esc_html_e( 'Send', 'sourcesay' ); ?></span></button>
		</div>
		<p class="ss-status" role="status" aria-live="polite"></p>
	</form>
</section>
	<?php
	return (string) ob_get_clean();
}
