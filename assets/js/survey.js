/* SourceSay thank-you survey. Vanilla, no dependencies. Without JS the form posts to admin-post.php. */
( function () {
	'use strict';

	function parse( json ) {
		try {
			return JSON.parse( json || '{}' ) || {};
		} catch ( e ) {
			return {};
		}
	}

	function init( root ) {
		var cfg = parse( root.getAttribute( 'data-sourcesay' ) );
		var t = parse( root.getAttribute( 'data-sourcesay-ui' ) );
		var form = root.querySelector( '.ss-form' );
		if ( ! form || ! cfg.rest || ! window.fetch ) {
			return;
		}
		var radios = form.querySelectorAll( '.ss-radio' );
		var fu = form.querySelector( '.ss-field--followup' );
		var other = form.querySelector( '.ss-field--other' );
		var status = form.querySelector( '.ss-status' );
		var send = form.querySelector( '.ss-send' );
		var skip = form.querySelector( '.ss-skip__btn' );
		var keyChoose = false;
		var busy = false;
		var lastSkip = false;
		var fuLabel = fu && fu.querySelector( 'label' );
		var defaultFuLabel = fuLabel ? fuLabel.textContent : '';

		root.classList.add( 'ss-js' );

		function current() {
			return form.querySelector( '.ss-radio:checked' );
		}

		function needsText( radio ) {
			return radio && ( radio.hasAttribute( 'data-followup' ) || radio.hasAttribute( 'data-other' ) );
		}

		// Show the text box the picked option needs (follow-up or Other), or just a Send button.
		function open( radio, focus ) {
			var isOther = radio.hasAttribute( 'data-other' );
			var hasFu = radio.hasAttribute( 'data-followup' );
			if ( fu ) {
				fu.hidden = ! hasFu;
				if ( hasFu ) {
					fuLabel.textContent = radio.getAttribute( 'data-followup' ) || defaultFuLabel;
					fu.querySelector( 'input' ).placeholder = radio.getAttribute( 'data-placeholder' ) || '';
				}
			}
			if ( other ) {
				other.hidden = ! isOther; // Its label already shows the prompt text.
			}
			root.classList.add( 'is-open' );
			if ( focus ) {
				var target = isOther ? other : ( hasFu ? fu : null );
				( target ? target.querySelector( 'input' ) : send ).focus();
			}
		}

		function setStatus( text ) {
			status.textContent = text || '';
		}

		function setBusy( on ) {
			busy = on;
			root.classList.toggle( 'is-busy', on );
			if ( on ) {
				root.setAttribute( 'aria-busy', 'true' );
			} else {
				root.removeAttribute( 'aria-busy' );
			}
			send.disabled = on;
			if ( skip ) {
				skip.disabled = on;
			}
		}

		function showError( message ) {
			setStatus( '' );
			var box = form.querySelector( '.ss-error' );
			if ( ! box ) {
				box = document.createElement( 'div' );
				box.className = 'ss-error';
				box.setAttribute( 'role', 'alert' );
				status.parentNode.insertBefore( box, status );
			}
			box.textContent = '';
			var msg = document.createElement( 'span' );
			msg.textContent = message;
			var retry = document.createElement( 'button' );
			retry.type = 'button';
			retry.className = 'ss-retry';
			retry.textContent = t.retry || 'Try again';
			retry.addEventListener( 'click', function () {
				submit( lastSkip );
			} );
			box.appendChild( msg );
			box.appendChild( retry );
		}

		function clearError() {
			var box = form.querySelector( '.ss-error' );
			if ( box ) {
				box.parentNode.removeChild( box );
			}
		}

		// quiet: the customer skipped, so a small line replaces the survey instead of the big thank-you.
		function done( message, quiet ) {
			var p = document.createElement( 'p' );
			p.className = 'ss-done' + ( quiet ? ' ss-done--quiet' : '' );
			var icon = document.createElement( 'span' );
			icon.className = 'ss-done__icon';
			if ( t.sprite ) {
				icon.innerHTML = '<svg class="ss-icon" aria-hidden="true" focusable="false"><use href=""></use></svg>';
				icon.querySelector( 'use' ).setAttribute( 'href', t.sprite + '#ss-i-check' );
			}
			var text = document.createElement( 'span' );
			text.className = 'ss-done__text';
			text.textContent = message || cfg.thankYou || '';
			p.appendChild( icon );
			p.appendChild( text );
			root.classList.remove( 'is-busy', 'is-open' );
			root.removeAttribute( 'aria-busy' );
			root.classList.add( 'is-done' );
			if ( quiet ) {
				root.classList.add( 'is-skipped' );
			}
			root.setAttribute( 'aria-live', 'polite' );
			p.tabIndex = -1;
			root.replaceChild( p, form );
			p.focus( { preventScroll: true } );
		}

		// isSkip: the skip button was pressed. Sends answer_id "__skip" and no texts.
		function submit( isSkip ) {
			var radio = isSkip ? null : current();
			if ( busy || ( ! isSkip && ! radio ) ) {
				return;
			}
			lastSkip = !! isSkip;
			clearError();
			setBusy( true );
			setStatus( t.sending || '' );
			var body = {
				order_id: cfg.orderId,
				order_key: cfg.orderKey,
				answer_id: isSkip ? '__skip' : radio.value,
				context: cfg.context,
				ss_website: ( form.elements.ss_website || {} ).value || '',
			};
			if ( radio && fu && ! fu.hidden && radio.hasAttribute( 'data-followup' ) ) {
				body.followup_text = fu.querySelector( 'input' ).value.trim();
			}
			if ( radio && other && ! other.hidden && radio.hasAttribute( 'data-other' ) ) {
				body.other_text = other.querySelector( 'input' ).value.trim();
			}
			fetch( cfg.rest, {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( body ),
			} )
				.then( function ( res ) {
					return res.json().catch( function () {
						return {};
					} ).then( function ( json ) {
						return { status: res.status, json: json };
					} );
				} )
				.then( function ( r ) {
					// 409 = this order already has an answer: nothing more to ask.
					if ( ( r.status === 200 && r.json.ok ) || r.status === 409 ) {
						if ( lastSkip && r.status === 200 ) {
							done( t.skipped || 'No problem, thanks!', true );
						} else {
							done( r.json.ok ? r.json.message : cfg.thankYou );
						}
						return;
					}
					throw r;
				} )
				.catch( function ( r ) {
					setBusy( false );
					var msg = t.error;
					if ( r && r.status === 429 ) {
						msg = t.limit;
					} else if ( r && r.json && r.json.message && r.status >= 400 && r.status < 500 ) {
						msg = r.json.message;
					}
					showError( msg || 'Error' );
				} );
		}

		// Space/Enter on an option = choose it. Arrow keys only move the selection.
		form.addEventListener( 'keydown', function ( e ) {
			if ( e.target.classList && e.target.classList.contains( 'ss-radio' ) ) {
				keyChoose = e.key === ' ' || e.key === 'Enter';
			}
		} );

		Array.prototype.forEach.call( radios, function ( radio ) {
			radio.addEventListener( 'click', function ( e ) {
				var chosen = e.detail > 0 || keyChoose;
				keyChoose = false;
				clearError();
				if ( ! chosen ) {
					// Keyboard or screen reader browsing: show the Send button instead of sending.
					open( radio, false );
					return;
				}
				if ( needsText( radio ) ) {
					open( radio, true );
				} else {
					root.classList.remove( 'is-open' );
					submit( false );
				}
			} );
		} );

		if ( skip ) {
			skip.addEventListener( 'click', function ( e ) {
				e.preventDefault();
				root.classList.remove( 'is-open' );
				submit( true );
			} );
		}

		form.addEventListener( 'submit', function ( e ) {
			e.preventDefault();
			var radio = current();
			if ( ! radio ) {
				return;
			}
			if ( needsText( radio ) && ! root.classList.contains( 'is-open' ) ) {
				open( radio, true );
				return;
			}
			submit( false );
		} );
	}

	function boot() {
		Array.prototype.forEach.call( document.querySelectorAll( '[data-sourcesay]' ), init );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', boot );
	} else {
		boot();
	}
}() );
