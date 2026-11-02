/**
 * SourceSay survey block (editor only). Dynamic block: the server renders the real survey
 * on thank-you pages, so save() returns null. No build step.
 */
( function ( wp ) {
	'use strict';

	if ( ! wp || ! wp.blocks || ! wp.element || ! wp.blockEditor ) {
		return;
	}
	var el = wp.element.createElement;
	var __ = wp.i18n && wp.i18n.__ ? wp.i18n.__ : function ( s ) {
		return s;
	};
	var useBlockProps = wp.blockEditor.useBlockProps;

	/* Inline styles: the editor canvas is an iframe, so a parent-page stylesheet would not reach it. */
	var accent = 'var(--wp--preset--color--primary, #4f5bff)';
	var S = {
		card: {
			boxSizing: 'border-box',
			padding: '20px 22px',
			border: '1px solid rgba(127,127,127,0.3)',
			borderRadius: '12px',
			background: 'transparent',
			color: 'inherit',
			fontFamily: 'inherit',
		},
		tag: {
			display: 'inline-flex',
			alignItems: 'center',
			gap: '6px',
			margin: '0 0 12px',
			padding: '2px 10px',
			borderRadius: '999px',
			background: 'rgba(127,127,127,0.12)',
			fontSize: '12px',
			fontWeight: 600,
			lineHeight: 1.6,
		},
		dot: {
			display: 'inline-block',
			width: '7px',
			height: '7px',
			borderRadius: '50%',
			background: accent,
		},
		q: { margin: 0, fontSize: '1.125em', fontWeight: 600, lineHeight: 1.3 },
		hint: { margin: '4px 0 0', fontSize: '0.875em', opacity: 0.75 },
		pills: { display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '14px 0 0', padding: 0, listStyle: 'none' },
		pill: {
			display: 'inline-flex',
			alignItems: 'center',
			minHeight: '40px',
			padding: '6px 16px',
			border: '1px solid rgba(127,127,127,0.35)',
			borderRadius: '999px',
			fontSize: '0.9375em',
			lineHeight: 1.25,
		},
		skip: { margin: '12px 0 0', fontSize: '0.875em', opacity: 0.7, textDecoration: 'underline', textUnderlineOffset: '0.2em' },
		note: { margin: '16px 0 0', paddingTop: '12px', borderTop: '1px dashed rgba(127,127,127,0.35)', fontSize: '13px', lineHeight: 1.5, opacity: 0.85 },
	};

	function Edit() {
		var props = useBlockProps ? useBlockProps( { className: 'ss-block-preview' } ) : { className: 'ss-block-preview' };
		var samples = [ __( 'Google search', 'sourcesay' ), __( 'Instagram', 'sourcesay' ), __( 'Friend or family', 'sourcesay' ) ];
		return el( 'div', props,
			el( 'div', { style: S.card },
				el( 'span', { style: S.tag, 'aria-hidden': 'true' }, el( 'span', { style: S.dot } ), __( 'SourceSay survey', 'sourcesay' ) ),
				el( 'p', { style: S.q, 'aria-hidden': 'true' }, __( 'How did you hear about us?', 'sourcesay' ) ),
				el( 'p', { style: S.hint, 'aria-hidden': 'true' }, __( 'Optional. Pick the one that fits best.', 'sourcesay' ) ),
				el( 'ul', { style: S.pills, 'aria-hidden': 'true' }, samples.map( function ( s, i ) {
					return el( 'li', { key: i, style: S.pill }, s );
				} ) ),
				el( 'p', { style: S.skip, 'aria-hidden': 'true' }, __( 'Prefer not to say', 'sourcesay' ) ),
				el( 'p', { style: S.note },
					__( 'Shows your SourceSay question on thank-you pages. Customers only see it after they place an order.', 'sourcesay' ),
					' ',
					__( 'Edit the question and answers in WooCommerce › SourceSay › Survey.', 'sourcesay' )
				)
			)
		);
	}

	wp.blocks.registerBlockType( 'sourcesay/survey', {
		edit: Edit,
		save: function () {
			return null;
		},
	} );
}( window.wp ) );
